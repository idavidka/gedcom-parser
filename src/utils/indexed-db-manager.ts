/**
 * IndexedDbManager Interface - Pluggable Architecture
 * 
 * The gedcom-parser package does NOT include a concrete implementation
 * to avoid browser-specific dependencies (like localforage).
 * 
 * The consumer must provide an implementation by calling setIndexedDbFactory()
 * 
 * Example implementation in your app:
 * ```typescript
 * import localforage from 'localforage';
 * import { setIndexedDbFactory } from '@treeviz/gedcom-parser';
 * 
 * class MyIndexedDbManager<T> {
 *   store: LocalForage;
 *   constructor(name: string, storeName: string, enc?: boolean) {
 *     this.store = localforage.createInstance({ name, storeName });
 *   }
 *   async getItem(key: string) { return this.store.getItem<T>(key); }
 *   async setItem(key: string, value: T) { return this.store.setItem(key, value); }
 *   clear() { return this.store.clear(); }
 *   // ... implement other methods
 * }
 * 
 * // Inject your implementation:
 * setIndexedDbFactory((name, storeName, dataType, enc) => 
 *   new MyIndexedDbManager(name, `${storeName}-${dataType}`, enc)
 * );
 * ```
 */

export interface IIndexedDbManager<T> {
	clear(): void;
	clearBy(comparer: (key: string) => boolean): Promise<void>;
	clearCache(): Promise<void>;
	getItem(key: string): Promise<T | null>;
	getAllItems(): Promise<Record<string, () => Promise<T>>>;
	setItem(key: string, value: T): Promise<void>;
}

export type IndexedDbFactory = <T>(
	name: string,
	storeName: string,
	dataType: string,
	enc?: boolean
) => IIndexedDbManager<T>;

// Default no-op implementation (safe for SSR, does nothing)
class NoOpIndexedDbManager<T> implements IIndexedDbManager<T> {
	clear() {}
	async clearBy(_comparer: (key: string) => boolean) {}
	async clearCache() {}
	async getItem(_key: string): Promise<T | null> {
		return null;
	}
	async getAllItems(): Promise<Record<string, () => Promise<T>>> {
		return {};
	}
	async setItem(_key: string, _value: T) {}
}

// Global factory - consumer overrides this
let indexedDbFactory: IndexedDbFactory = () => new NoOpIndexedDbManager();

/**
 * Set the IndexedDB factory implementation
 * Call this once in your app initialization with your own implementation
 * 
 * @example
 * ```typescript
 * import { setIndexedDbFactory } from '@treeviz/gedcom-parser';
 * setIndexedDbFactory((name, storeName, dataType, enc) => {
 *   return new MyIndexedDbManager(name, `${storeName}-${dataType}`, enc);
 * });
 * ```
 */
export const setIndexedDbFactory = (factory: IndexedDbFactory) => {
	indexedDbFactory = factory;
};

/**
 * Get an IndexedDB instance
 * Uses the factory provided by setIndexedDbFactory(), or a no-op implementation if none provided
 */
export const getInstance = <T>(
	name: string,
	storeName: string,
	dataType: string,
	enc?: boolean
): IIndexedDbManager<T> => {
	return indexedDbFactory<T>(name, storeName, dataType, enc);
};

export default IIndexedDbManager;
