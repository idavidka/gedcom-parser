import { debounce } from "lodash-es";

import type {Path} from "../classes/indi";
import type {Individuals} from "../classes/indis";
import { getCacheManagerFactory } from "../factories/cache-factory";
import type {IndiKey} from "../types/types";

/**
 * Cache manager interface for pluggable cache implementations.
 * The main project can inject custom implementations (e.g., IndexedDB) via setCacheManagerFactory.
 */
export interface ICacheManager<T> {
	getItem: () => Promise<T | null>;
	setItem: (value: T) => Promise<void>;
}

interface Caches {
	pathCache: Record<`${IndiKey}|${IndiKey}`, Path> | undefined;
	relativesOnLevelCache:
		| Record<IndiKey, Record<number, Individuals>>
		| undefined;
	relativesOnDegreeCache:
		| Record<IndiKey, Record<number, Individuals>>
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
};

const getInstance = getCacheManagerFactory();

const cacheDbs: CacheDbs = {
	pathCache: getInstance<Caches["pathCache"]>("ftv", "Main", "path", true),
	relativesOnDegreeCache: getInstance<Caches["relativesOnDegreeCache"]>(
		"ftv",
		"Main",
		"path",
		true
	),
	relativesOnLevelCache: getInstance<Caches["relativesOnLevelCache"]>(
		"ftv",
		"Main",
		"path",
		true
	),
};

const _storeCache: CacheStores = {
	pathCache: debounce((value) => {
		if (value) {
			cacheDbs.pathCache.setItem(value);
		}
	}, 50),
	relativesOnLevelCache: debounce((value) => {
		if (value) {
			cacheDbs.relativesOnLevelCache.setItem(value);
		}
	}, 50),
	relativesOnDegreeCache: debounce((value) => {
		if (value) {
			cacheDbs.relativesOnDegreeCache.setItem(value);
		}
	}, 50),
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

export const resetRelativesCache = () => {
	caches.relativesOnDegreeCache = {};
	caches.relativesOnLevelCache = {};
};

export const relativesCache =
	(cacheKey: keyof Omit<Caches, "pathCache">) =>
	<T extends Individuals | undefined>(
		key: IndiKey,
		subKey: number,
		value?: T
	) => {
		if (!caches[cacheKey]) {
			caches[cacheKey] = {};
		}

		if (value && caches[cacheKey]) {
			if (!caches[cacheKey]![key]) {
				caches[cacheKey]![key] = {};
			}

			caches[cacheKey]![key]![subKey] = value;

			return caches[cacheKey]![key][subKey] as Exclude<T, undefined>;
		}

		return caches[cacheKey]?.[key]?.[subKey] as T;
	};

export const pathCache = <T extends Path | undefined>(
	key: `${IndiKey}|${IndiKey}`,
	value?: T
) => {
	if (!caches.pathCache) {
		caches.pathCache = {};
	}

	if (value && caches.pathCache) {
		caches.pathCache[key] = value;

		return caches.pathCache[key] as Exclude<T, undefined>;
	}

	return caches.pathCache?.[key] as T;
};
