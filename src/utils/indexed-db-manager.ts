/**
 * Stub for IndexedDB manager
 * This is a browser-only feature, so we provide a minimal interface
 * Consumer can implement their own IndexedDB manager if needed
 */

export default class IndexedDbManager<T> {
	constructor(
		_dbName: string,
		_storeName: string,
		_key: string,
		_autoCommit?: boolean
	) {
		// Stub implementation
	}

	async getItem(_key: string): Promise<T | undefined> {
		return undefined;
	}

	async setItem(_key: string, _value: T): Promise<void> {
		// No-op in stub
	}

	async removeItem(_key: string): Promise<void> {
		// No-op in stub
	}

	async clear(): Promise<void> {
		// No-op in stub
	}
}

export const getInstance = <T>(
	dbName: string,
	storeName: string,
	key: string,
	autoCommit?: boolean
): IndexedDbManager<T> => {
	return new IndexedDbManager<T>(dbName, storeName, key, autoCommit);
};
