import { debounce } from "lodash-es";

import type { GedComType } from "../classes/gedcom";
import type { Path, PathItem, ProfilePicture } from "../classes/indi";
import type { Individuals } from "../classes/indis";
import { getCacheManagerFactory } from "../factories/cache-factory";
import type { Kinship } from "../kinship-translator/kinship-translator.interface";
import { RelationType, type IndiKey } from "../types/types";

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
 * Uses tree ID and tree name to create a stable, human-readable cache key
 */
const getGedcomId = (gedcom?: GedComType): string => {
	if (!gedcom) {
		return "unknown";
	}

	// Use getTreeId() and getTreeName() from Common class for consistent identification
	const treeId = gedcom.getTreeId?.() || "";
	const treeName = gedcom.getTreeName?.() || "";

	// Sanitize tree name for use in cache key (remove special chars, spaces)
	const sanitizedName = treeName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");

	// Create a unique key combining tree ID and sanitized name
	// Format: treeId_treeName or just treeId if no name
	if (treeId && sanitizedName) {
		return `${treeId}_${sanitizedName}`;
	} else if (treeId) {
		return treeId;
	} else if (sanitizedName) {
		return sanitizedName;
	}

	// Fallback: use refcount
	return `gedcom_${gedcom.refcount}`;
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

const isNonBiologicalPath = (path: Path): boolean =>
	path.some(
		(item) => item.relation && item.relation !== RelationType.BIOLOGICAL
	);

const invertHop = (kinship: Kinship): Kinship => {
	if (kinship === "parent") {
		return "child";
	}
	if (kinship === "child") {
		return "parent";
	}
	return kinship;
};

const hopRelation = (
	from: PathItem,
	toIndi: PathItem["indi"],
	kinship: Kinship,
	inherited?: RelationType
): RelationType | undefined => {
	if (kinship === "parent" || kinship === "child") {
		const parent = kinship === "parent" ? toIndi : from.indi;
		const child = kinship === "parent" ? from.indi : toIndi;
		const currentRelation = child.getParentType(parent);
		if (currentRelation && currentRelation !== RelationType.BIOLOGICAL) {
			return currentRelation;
		}
	}

	if (inherited && inherited !== RelationType.BIOLOGICAL) {
		return inherited;
	}

	return undefined;
};

/**
 * Rebuild a path so the first person is "self" at level 0 and every later
 * hop has level/degree/relation computed as if BFS had started there.
 */
const rebuildPathFromHops = (
	hops: Array<{ indi: PathItem["indi"]; kinship: Kinship }>,
	skipRelation = false
): Path => {
	if (hops.length === 0) {
		return [];
	}

	const path: Path = [
		{
			indi: hops[0].indi,
			kinship: "self",
			level: 0,
			levelUp: 0,
			levelDown: 0,
			degree: 0,
		},
	];

	for (let i = 1; i < hops.length; i++) {
		const prev = path[i - 1];
		const { indi, kinship } = hops[i];
		const relation = skipRelation
			? undefined
			: hopRelation(prev, indi, kinship, prev.relation);

		if (kinship === "parent") {
			path.push({
				indi,
				kinship,
				relation,
				level: prev.level + 1,
				levelUp: prev.levelUp + 1,
				levelDown: prev.levelDown,
				degree: prev.degree,
			});
			continue;
		}

		if (kinship === "child") {
			path.push({
				indi,
				kinship,
				relation,
				level: prev.level - 1,
				levelUp: prev.levelUp,
				levelDown: prev.levelDown + 1,
				degree: prev.levelUp
					? prev.level > 0
						? prev.levelUp - prev.level + 1
						: prev.levelDown - Math.abs(prev.level)
					: 0,
			});
			continue;
		}

		path.push({
			indi,
			kinship,
			relation,
			level: prev.level,
			levelUp: prev.levelUp,
			levelDown: prev.levelDown,
			degree: prev.degree,
		});
	}

	return path;
};

const storePathIfBetter = (
	gedcom: GedComType | undefined,
	fromId: IndiKey,
	toId: IndiKey,
	path: Path
) => {
	const key = `${fromId}|${toId}` as `${IndiKey}|${IndiKey}`;
	const existing = pathCache(gedcom, key);
	if (
		existing &&
		(!isNonBiologicalPath(existing) || isNonBiologicalPath(path))
	) {
		return;
	}

	pathCache(gedcom, key, path);
};

/**
 * After a path is discovered, cache every pair of people on it (both
 * directions) so a later query for two people who already sat on this
 * route does not need another BFS.
 *
 * Prefixes from the start keep the original items (already relative to the
 * start). Other subpaths are rebuilt so level/degree start at 0.
 *
 * Mixed (step/adopted/...) subpaths longer than one hop are not cached:
 * a pair on a mixed route may still have a better biological path of its
 * own. Direct hops and the originally requested pair are always stored.
 */
export const cacheDiscoveredPath = (
	gedcom: GedComType | undefined,
	path: Path
) => {
	const n = path.length;
	if (n < 2) {
		return;
	}

	for (let i = 0; i < n; i++) {
		const fromId = path[i].indi.id;
		if (!fromId) {
			continue;
		}

		for (let j = i + 1; j < n; j++) {
			const toId = path[j].indi.id;
			if (!toId) {
				continue;
			}

			const isOriginalPair = i === 0 && j === n - 1;
			const isDirectHop = j === i + 1;
			const slice = path.slice(i, j + 1);
			const sliceMixed = isNonBiologicalPath(slice);

			if (!isOriginalPair && !isDirectHop && sliceMixed) {
				continue;
			}

			const forward =
				i === 0 ? slice : rebuildPathFromHops(slice, !sliceMixed);
			const reverseHops: Array<{
				indi: PathItem["indi"];
				kinship: Kinship;
			}> = [
				{
					indi: slice[slice.length - 1].indi,
					kinship: "self",
				},
			];
			for (let k = slice.length - 2; k >= 0; k--) {
				reverseHops.push({
					indi: slice[k].indi,
					kinship: invertHop(slice[k + 1].kinship),
				});
			}
			const reverse = rebuildPathFromHops(reverseHops, !sliceMixed);

			storePathIfBetter(gedcom, fromId, toId, forward);
			storePathIfBetter(gedcom, toId, fromId, reverse);
		}
	}
};
