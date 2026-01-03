import type { ICacheManager } from "../utils/cache";

/**
 * Factory function type for creating cache manager instances.
 * This allows the main project to inject custom cache implementations (e.g., IndexedDB).
 */
export type CacheManagerFactory = <T>(
	name: string,
	store: string,
	type: string,
	encrypted: boolean
) => ICacheManager<T>;

/**
 * Default in-memory cache manager factory.
 * This is used as a fallback when no custom factory is provided.
 */
const defaultCacheFactory: CacheManagerFactory = <T>() => {
	let cache: T | null = null;
	return {
		getItem: async () => cache,
		setItem: async (value: T) => {
			cache = value;
		},
	};
};

let cacheFactory: CacheManagerFactory = defaultCacheFactory;

/**
 * Set a custom cache manager factory.
 * Call this from the main project to inject IndexedDB or other cache implementations.
 *
 * @example
 * ```typescript
 * import { setCacheManagerFactory } from '@treeviz/gedcom-parser/factories/cache-factory';
 * import { getInstance } from './utils/indexed-db-manager';
 *
 * setCacheManagerFactory(getInstance);
 * ```
 */
export const setCacheManagerFactory = (factory: CacheManagerFactory) => {
	cacheFactory = factory;
};

/**
 * Get the current cache manager factory.
 * Used internally by the cache utility.
 */
export const getCacheManagerFactory = (): CacheManagerFactory => {
	return cacheFactory;
};

/**
 * Reset to default in-memory cache factory.
 * Useful for testing or when switching between projects.
 */
export const resetCacheManagerFactory = () => {
	cacheFactory = defaultCacheFactory;
};
