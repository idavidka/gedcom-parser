/**
 * Pluggable Cache Manager for gedcom-parser
 * 
 * The gedcom-parser package needs caching for performance (path calculations, relatives),
 * but doesn't dictate HOW or WHERE data is cached. The consumer provides the implementation.
 * 
 * Default behavior: No caching (no-op) - safe for SSR and environments without storage.
 * 
 * @example
 * ```typescript
 * // Consumer provides cache implementation (IndexedDB, localStorage, Redis, etc.):
 * import { setCacheFactory } from '@treeviz/gedcom-parser';
 * 
 * class MyIndexedDbCache<T> implements ICacheManager<T> {
 *   store: LocalForage;
 *   constructor(name: string, storeName: string, enc?: boolean) {
 *     this.store = localforage.createInstance({ name, storeName });
 *   }
 *   async getItem(key: string) { return this.store.getItem<T>(key); }
 *   async setItem(key: string, value: T) { return this.store.setItem(key, value); }
 *   clear() { this.store.clear(); }
 *   // ... implement other methods
 * }
 * 
 * // Inject your implementation:
 * setCacheFactory((name, storeName, dataType, enc) => 
 *   new MyIndexedDbCache(name, `${storeName}-${dataType}`, enc)
 * );
 * 
 * // Now gedcom-parser will use your cache implementation
 * // If you don't call setCacheFactory(), caching is skipped (no-op)
 * ```
 */

/**
 * Cache Manager interface - consumer can implement with any storage backend
 * (IndexedDB, localStorage, Redis, in-memory Map, etc.)
 */
export interface ICacheManager<T> {
	/**
	 * Clear all items from the cache
	 */
	clear(): void;

	/**
	 * Clear items matching the comparer function
	 * @param comparer Function that returns true for keys to delete
	 */
	clearBy(comparer: (key: string) => boolean): Promise<void>;

	/**
	 * Clear the in-memory cache (if applicable)
	 */
	clearCache(): Promise<void>;

	/**
	 * Get an item from the cache
	 * @param key The key to retrieve
	 * @returns The cached value or null if not found
	 */
	getItem(key: string): Promise<T | null>;

	/**
	 * Get all items as a record of lazy-loaded promises
	 * @returns Record of keys to promise factories
	 */
	getAllItems(): Promise<Record<string, () => Promise<T>>>;

	/**
	 * Set an item in the cache
	 * @param key The key to store under
	 * @param value The value to store
	 */
	setItem(key: string, value: T): Promise<void>;
}

/**
 * Factory function type for creating cache manager instances
 * Consumer provides this to customize caching behavior
 */
export type CacheFactory = <T>(
	name: string,
	storeName: string,
	dataType: string,
	enc?: boolean
) => ICacheManager<T>;

/**
 * Default no-op cache manager - doesn't cache anything
 * Used when no factory is configured (consumer skips caching)
 */
class NoOpCacheManager<T> implements ICacheManager<T> {
	clear(): void {
		// No-op: no caching
	}

	async clearBy(_comparer: (key: string) => boolean): Promise<void> {
		// No-op: no caching
	}

	async clearCache(): Promise<void> {
		// No-op: no caching
	}

	async getItem(_key: string): Promise<T | null> {
		// Always return null - no cache available
		return null;
	}

	async getAllItems(): Promise<Record<string, () => Promise<T>>> {
		// Always return empty - no cache available
		return {};
	}

	async setItem(_key: string, _value: T): Promise<void> {
		// No-op: skip caching
	}
}

// Global factory - starts as null (no caching by default)
let cacheFactory: CacheFactory | null = null;

/**
 * Set the cache factory implementation
 * Call this in your app initialization to enable caching
 * 
 * If not called, caching will be skipped (no-op behavior)
 * 
 * @param factory Factory function that creates cache manager instances
 * 
 * @example
 * ```typescript
 * import { setCacheFactory } from '@treeviz/gedcom-parser';
 * setCacheFactory((name, storeName, dataType, enc) => {
 *   return new MyIndexedDbCache(name, `${storeName}-${dataType}`, enc);
 * });
 * ```
 */
export const setCacheFactory = (factory: CacheFactory) => {
	cacheFactory = factory;
};

/**
 * Get a cache manager instance using the configured factory
 * 
 * If no factory is configured (setCacheFactory not called),
 * returns a no-op manager that skips all caching operations
 * 
 * @returns Cache manager instance or no-op if no factory configured
 */
export const getInstance = <T>(
	name: string,
	storeName: string,
	dataType: string,
	enc?: boolean
): ICacheManager<T> => {
	if (!cacheFactory) {
		// No factory configured - return no-op (skip caching)
		return new NoOpCacheManager<T>();
	}

	return cacheFactory<T>(name, storeName, dataType, enc);
};

// Legacy export for backward compatibility
export type { ICacheManager as IIndexedDbManager };
export { setCacheFactory as setIndexedDbFactory };
export type { CacheFactory as IndexedDbFactory };

