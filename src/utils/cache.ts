/**
 * Cache stub - minimal implementation for path and relatives caching
 * Uses in-memory cache with proper TypeScript overloads
 */

import type { Individuals } from "../classes/indis";
import type { Path } from "../interfaces/path";
import type { IndiKey } from "../types";

type CacheValue = Path | Record<string, unknown> | unknown;
const memoryCache = new Map<string, CacheValue>();
const relativesCaches = new Map<string, Map<string, Map<number, Individuals>>>();

// Overload signatures for pathCache
export function pathCache(key: string): Path | undefined;
export function pathCache(key: string, value: Path): Path;
export function pathCache(key: string, value?: Path): Path | undefined {
	if (value !== undefined) {
		memoryCache.set(`path:${key}`, value);
		return value;
	}
	const cached = memoryCache.get(`path:${key}`);
	return cached as Path | undefined;
}

/**
 * Curried function for relatives caching
 * Usage: relativesCache("cacheKey")(indiKey, subKey, value)
 */
export function relativesCache(cacheKey: string) {
	return <T extends Individuals | undefined>(
		key: IndiKey,
		subKey: number,
		value?: T
	): T => {
		// Initialize cache for this cacheKey if not exists
		if (!relativesCaches.has(cacheKey)) {
			relativesCaches.set(cacheKey, new Map());
		}
		
		const cache = relativesCaches.get(cacheKey)!;
		
		if (value !== undefined) {
			// Set value in cache
			if (!cache.has(key)) {
				cache.set(key, new Map());
			}
			cache.get(key)!.set(subKey, value as Individuals);
			return value;
		}
		
		// Get value from cache
		const cached = cache.get(key)?.get(subKey);
		return cached as T;
	};
}


