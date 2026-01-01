/**
 * Centralized cache management for place-related operations
 *
 * This module provides a unified caching system for various place-related
 * operations to improve performance by avoiding redundant computations.
 *
 * Cache types:
 * - countyRegexp: Compiled regular expressions for county matching per country
 * - guessTown: Results of town guessing operations
 * - sortedTownSources: Pre-sorted town data sources per country
 * - detectCountryName: Country name detection results
 * - isCountryName: Country name validation results
 * - placeParts: Parsed place components (country, county, town, etc.)
 */

/**
 * Interface defining all available cache types
 */
export interface PlaceCacheStore {
	// County regexp cache per country
	countyRegexp: Record<string, RegExp>;
	// guessTown results cache
	guessTown: Record<
		string,
		{ county?: string; country?: string; map?: string }[] | undefined
	>;
	// Sorted town sources per country
	sortedTownSources: Record<
		string,
		Array<{ data: Record<string, unknown>; _year?: number }>
	>;
	// Country name detection cache
	detectCountryName: Record<string, string | undefined>;
	// Country name validation cache
	isCountryName: Record<string, boolean>;
	// Place parts parsing cache
	placeParts: Record<
		string,
		{
			country?: string;
			county?: string;
			town?: string;
			map?: string;
			original: string;
			current?: string;
			parts: string[];
			leftParts: string[];
		}[]
	>;
	// Town name variants based on letter variants
	townVariants: Record<string, string[]>;
}

/**
 * The central cache store containing all cache types
 */
export const placeCaches: PlaceCacheStore = {
	countyRegexp: {},
	guessTown: {},
	sortedTownSources: {},
	detectCountryName: {},
	isCountryName: {},
	placeParts: {},
	townVariants: {},
};

/**
 * Cache enabled state
 * When false, caches will not be used (always call factory functions)
 */
let cacheEnabled = true;

/**
 * Enable or disable caching globally
 *
 * @param enabled - Whether to enable caching
 *
 * @example
 * ```typescript
 * // Disable caching for performance testing
 * setCacheEnabled(false);
 *
 * // Re-enable caching
 * setCacheEnabled(true);
 * ```
 */
export const setCacheEnabled = (enabled: boolean) => {
	cacheEnabled = enabled;
};

/**
 * Get current cache enabled state
 *
 * @returns Whether caching is currently enabled
 */
export const isCacheEnabled = (): boolean => {
	return cacheEnabled;
};

/**
 * Get or create a cached value
 *
 * This helper function implements the cache-aside pattern:
 * 1. Check if caching is enabled
 * 2. If caching is disabled, always call factory function
 * 3. If caching is enabled, check if value exists in cache
 * 4. If yes, return cached value
 * 5. If no, call factory function to compute value, store in cache, and return
 *
 * @param cacheType - The type of cache to use (must be a key of PlaceCacheStore)
 * @param key - The cache key to look up
 * @param factory - Function to compute the value if not in cache
 * @returns The cached or newly computed value
 *
 * @example
 * ```typescript
 * const regexp = getOrSetCache('countyRegexp', 'Hungary', () => {
 *   return new RegExp('...');
 * });
 * ```
 */
export const getOrSetCache = <K extends keyof PlaceCacheStore, V>(
	cacheType: K,
	key: string,
	factory: () => V
): V => {
	// If caching is disabled, always compute the value
	if (!cacheEnabled) {
		return factory();
	}

	const cache = placeCaches[cacheType] as Record<string, V>;
	if (cache[key] !== undefined) {
		return cache[key];
	}
	const value = factory();
	cache[key] = value;
	return value;
};

/**
 * Clear all caches
 *
 * Useful for testing or when underlying data changes and caches need to be invalidated.
 * This function removes all entries from all cache types.
 *
 * @example
 * ```typescript
 * // After updating town configuration
 * clearPlaceCaches();
 * ```
 */
export const clearPlaceCaches = () => {
	Object.keys(placeCaches.countyRegexp).forEach(
		(key) => delete placeCaches.countyRegexp[key]
	);
	Object.keys(placeCaches.guessTown).forEach(
		(key) => delete placeCaches.guessTown[key]
	);
	Object.keys(placeCaches.sortedTownSources).forEach(
		(key) => delete placeCaches.sortedTownSources[key]
	);
	Object.keys(placeCaches.detectCountryName).forEach(
		(key) => delete placeCaches.detectCountryName[key]
	);
	Object.keys(placeCaches.isCountryName).forEach(
		(key) => delete placeCaches.isCountryName[key]
	);
	Object.keys(placeCaches.placeParts).forEach(
		(key) => delete placeCaches.placeParts[key]
	);
	Object.keys(placeCaches.townVariants).forEach(
		(key) => delete placeCaches.townVariants[key]
	);
};

/**
 * Clear a specific cache type
 *
 * @param cacheType - The type of cache to clear
 *
 * @example
 * ```typescript
 * // Clear only the guessTown cache
 * clearCacheType('guessTown');
 * ```
 */
export const clearCacheType = (cacheType: keyof PlaceCacheStore) => {
	const cache = placeCaches[cacheType] as Record<string, unknown>;
	Object.keys(cache).forEach((key) => delete cache[key]);
};

/**
 * Get cache statistics
 *
 * Returns the number of entries in each cache type, useful for monitoring
 * memory usage and cache effectiveness.
 *
 * @returns Object with cache type names as keys and entry counts as values
 *
 * @example
 * ```typescript
 * const stats = getCacheStats();
 * console.log(`guessTown cache has ${stats.guessTown} entries`);
 * ```
 */
export const getCacheStats = (): Record<keyof PlaceCacheStore, number> => {
	return {
		countyRegexp: Object.keys(placeCaches.countyRegexp).length,
		guessTown: Object.keys(placeCaches.guessTown).length,
		sortedTownSources: Object.keys(placeCaches.sortedTownSources).length,
		detectCountryName: Object.keys(placeCaches.detectCountryName).length,
		isCountryName: Object.keys(placeCaches.isCountryName).length,
		placeParts: Object.keys(placeCaches.placeParts).length,
		townVariants: Object.keys(placeCaches.townVariants).length,
	};
};
