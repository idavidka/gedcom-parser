import { debounce } from "lodash-es";

import type { GedComType } from "../classes/gedcom";
import type { Path, ProfilePicture } from "../classes/indi";
import type { Individuals } from "../classes/indis";
import { getCacheManagerFactory } from "../factories/cache-factory";
import type { IndiKey } from "../types/types";

/**
 * Cache manager interface for pluggable cache implementations.
 * The main project can inject custom implementations (e.g., IndexedDB) via setCacheManagerFactory.
 */
export interface ICacheManager<T> {
	getItem: () => Promise<T | null>;
	setItem: (value: T) => Promise<void>;
}

/**
 * Generates a unique identifier for a GEDCOM file
 * Uses the refcount as a stable identifier for cache keys
 */
const getGedcomId = (gedcom?: GedComType): string => {
	if (!gedcom) {
		return "unknown";
	}
	// Use a combination of HEAD.FILE (if exists) and refcount for uniqueness
	const fileValue = gedcom.get("HEAD")?.get("FILE")?.toValue();
	const sourValue = gedcom.get("HEAD")?.get("SOUR")?.get("NAME")?.toValue();
	
	const fileName =
		(typeof fileValue === "string" ? fileValue : "") ||
		(typeof sourValue === "string" ? sourValue : "") ||
		"";
	// Create a stable ID from filename or use refcount
	return fileName || `gedcom_${gedcom.refcount}`;
};

interface Caches {
	// Cache keys now include GEDCOM ID prefix: `${gedcomId}:${...originalKey}`
	pathCache: Record<`${string}:${IndiKey}|${IndiKey}`, Path> | undefined;
	relativesOnLevelCache:
		| Record<`${string}:${IndiKey}`, Record<number, Individuals>>
		| undefined;
	relativesOnDegreeCache:
		| Record<`${string}:${IndiKey}`, Record<number, Individuals>>
		| undefined;
	profilePictureCache:
		| Record<`${string}:${IndiKey}`, ProfilePicture>
		| undefined;
}

type CacheStores = {
	[x in keyof Caches]: (value: Caches[x]) => void;
};

type CacheDbs = {
	[x in keyof Caches]: ICacheManager<Caches[x]>;
};

const caches: Caches = {
	pathCache: {},
	relativesOnDegreeCache: {},
	relativesOnLevelCache: {},
	profilePictureCache: {},
};

// NOTE: Only profilePictureCache is actively persisted to IndexedDB
// The other caches (pathCache, relativesOn*Cache) are kept in memory only for performance
// IMPORTANT: cacheDbs is lazily initialized to ensure getCacheManagerFactory() returns
// the correct factory (set by initGedcomParser) instead of the default placeholder
let cacheDbs: CacheDbs | undefined;

const getCacheDbs = (): CacheDbs => {
	if (!cacheDbs) {
		const getInstance = getCacheManagerFactory();
		cacheDbs = {
			pathCache: getInstance<Caches["pathCache"]>(
				"ftv",
				"Main",
				"path",
				true
			),
			relativesOnDegreeCache: getInstance<
				Caches["relativesOnDegreeCache"]
			>("ftv", "Main", "path", true),
			relativesOnLevelCache: getInstance<Caches["relativesOnLevelCache"]>(
				"ftv",
				"Main",
				"path",
				true
			),
			profilePictureCache: getInstance<Caches["profilePictureCache"]>(
				"ftv",
				"Main",
				"images",
				false
			),
		};
	}
	return cacheDbs;
};

const storeCache: CacheStores = {
	// NOTE: pathCache, relativesOnLevelCache, and relativesOnDegreeCache are intentionally
	// kept in memory only. These debounced functions exist to satisfy the type system
	// but are never called.
	pathCache: debounce((value) => {
		if (value) {
			getCacheDbs().pathCache.setItem(value);
		}
	}, 50),
	relativesOnLevelCache: debounce((value) => {
		if (value) {
			getCacheDbs().relativesOnLevelCache.setItem(value);
		}
	}, 50),
	relativesOnDegreeCache: debounce((value) => {
		if (value) {
			getCacheDbs().relativesOnDegreeCache.setItem(value);
		}
	}, 50),
	// profilePictureCache IS persisted to IndexedDB
	profilePictureCache: debounce((value) => {
		if (value) {
			getCacheDbs().profilePictureCache.setItem(value);
		}
	}, 100),
};

export type CacheRelatives<O extends keyof Caches = "pathCache"> = <
	T extends keyof Omit<Caches, O>,
	K extends keyof NonNullable<Omit<Caches, O>[T]>,
>(
	cacheKey: T
) => (
	key: K,
	subKey: number,
	...values: [keyof NonNullable<Omit<Caches, O>[T]>[K]]
) => NonNullable<Omit<Caches, O>[T]>[K];

// Initialize cache from IndexedDB on startup
// NOTE: This function MUST be called from the main app after setting up the cache manager factory
// (via setCacheManagerFactory in initGedcomParser). If not called, the gedcom-parser will use
// in-memory cache only, which is still functional but won't persist data between sessions.
let cacheInitialized = false;
export const initializeCache = async () => {
	if (cacheInitialized) {
		return;
	}

	cacheInitialized = true;

	// NOTE: Only profilePictureCache is persisted to IndexedDB
	// pathCache, relativesOnLevelCache, and relativesOnDegreeCache are intentionally
	// kept in memory only for performance reasons
	try {
		const profilePictureData =
			await getCacheDbs().profilePictureCache.getItem();

		if (profilePictureData) {
			caches.profilePictureCache = profilePictureData;
		}
	} catch (_error) {
		// Cache manager factory might not be initialized yet
		// This is fine - cache will be populated as images are loaded
	}
};

export const resetRelativesCache = () => {
	caches.relativesOnDegreeCache = {};
	caches.relativesOnLevelCache = {};
};

export const relativesCache =
	(cacheKey: "relativesOnLevelCache" | "relativesOnDegreeCache") =>
	<T extends Individuals | undefined>(
		gedcom: GedComType | undefined,
		key: IndiKey,
		subKey: number,
		value?: T
	) => {
		const gedcomId = getGedcomId(gedcom);
		const fullKey = `${gedcomId}:${key}` as `${string}:${IndiKey}`;

		const cache = caches[cacheKey] as
			| Record<`${string}:${IndiKey}`, Record<number, Individuals>>
			| undefined;

		if (!cache) {
			caches[cacheKey] = {} as Record<
				`${string}:${IndiKey}`,
				Record<number, Individuals>
			>;
		}

		if (value) {
			const typedCache = caches[cacheKey] as Record<
				`${string}:${IndiKey}`,
				Record<number, Individuals>
			>;
			if (!typedCache[fullKey]) {
				typedCache[fullKey] = {};
			}

			typedCache[fullKey]![subKey] = value;

			// NOTE: relativesOnLevelCache and relativesOnDegreeCache are intentionally
			// kept in memory only (not persisted to IndexedDB)

			return typedCache[fullKey]![subKey] as Exclude<T, undefined>;
		}

		const typedCache = caches[cacheKey] as
			| Record<`${string}:${IndiKey}`, Record<number, Individuals>>
			| undefined;
		return typedCache?.[fullKey]?.[subKey] as T;
	};

export const pathCache = <T extends Path | undefined>(
	gedcom: GedComType | undefined,
	key: `${IndiKey}|${IndiKey}`,
	value?: T
) => {
	const gedcomId = getGedcomId(gedcom);
	const fullKey = `${gedcomId}:${key}` as `${string}:${IndiKey}|${IndiKey}`;

	if (!caches.pathCache) {
		caches.pathCache = {};
	}

	if (value && caches.pathCache) {
		caches.pathCache[fullKey] = value;

		// NOTE: pathCache is intentionally kept in memory only (not persisted to IndexedDB)

		return caches.pathCache[fullKey] as Exclude<T, undefined>;
	}

	return caches.pathCache?.[fullKey] as T;
};

export const profilePictureCache = <T extends ProfilePicture | undefined>(
	gedcom: GedComType | undefined,
	key: IndiKey,
	value?: T
) => {
	const gedcomId = getGedcomId(gedcom);
	const fullKey = `${gedcomId}:${key}` as `${string}:${IndiKey}`;

	if (!caches.profilePictureCache) {
		caches.profilePictureCache = {};
	}

	if (value && caches.profilePictureCache) {
		caches.profilePictureCache[fullKey] = value;
		storeCache.profilePictureCache(caches.profilePictureCache);

		return caches.profilePictureCache[fullKey] as Exclude<T, undefined>;
	}

	const cached = caches.profilePictureCache?.[fullKey] as T;
	return cached;
};
