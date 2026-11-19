import type {
	GedcomRecord,
	GedcomStore,
	GedcomTreeMeta,
} from "./types";
import { GEDCOM_STORE_DB_NAME, GEDCOM_STORE_VERSION } from "./types";

const META_STORE = "meta";
const RECORDS_STORE = "records";
const TOMBSTONES_STORE = "tombstones";

type TombstoneRow = { treeId: string; id: string };

const openDb = (databaseName: string): Promise<IDBDatabase> => {
	if (typeof indexedDB === "undefined") {
		return Promise.reject(
			new Error(
				"indexeddb:// requires the IndexedDB global; use memory:// in Node, CLI, or Cloud Functions"
			)
		);
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(databaseName, GEDCOM_STORE_VERSION);
		request.onerror = () =>
			reject(request.error ?? new Error("Failed to open IndexedDB"));
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(META_STORE)) {
				db.createObjectStore(META_STORE, { keyPath: "treeId" });
			}
			if (!db.objectStoreNames.contains(RECORDS_STORE)) {
				const store = db.createObjectStore(RECORDS_STORE, {
					keyPath: ["treeId", "id"],
				});
				store.createIndex("byTree", "treeId", { unique: false });
				store.createIndex("byType", ["treeId", "tag"], {
					unique: false,
				});
				store.createIndex("byOrder", ["treeId", "order"], {
					unique: false,
				});
			}
			if (!db.objectStoreNames.contains(TOMBSTONES_STORE)) {
				db.createObjectStore(TOMBSTONES_STORE, {
					keyPath: ["treeId", "id"],
				});
			}
		};
	});
};

const dbCache = new Map<string, Promise<IDBDatabase>>();

const getDb = (databaseName: string) => {
	let pending = dbCache.get(databaseName);
	if (!pending) {
		pending = openDb(databaseName);
		dbCache.set(databaseName, pending);
	}
	return pending;
};

const reqToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
	new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("IndexedDB request failed"));
	});

/**
 * Native IndexedDB backend. No `idb` / localforage dependency.
 */
export const createIndexedDbGedcomStore = (
	databaseName: string = GEDCOM_STORE_DB_NAME
): GedcomStore => {
	const withStore = async <T>(
		storeName: string,
		mode: IDBTransactionMode,
		fn: (store: IDBObjectStore) => Promise<T> | T
	): Promise<T> => {
		const db = await getDb(databaseName);
		const tx = db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);
		const result = await fn(store);
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () =>
				reject(tx.error ?? new Error("IndexedDB transaction failed"));
			tx.onabort = () =>
				reject(tx.error ?? new Error("IndexedDB transaction aborted"));
		});
		return result;
	};

	return {
		async getMeta(treeId) {
			return withStore(META_STORE, "readonly", (store) =>
				reqToPromise(store.get(treeId) as IDBRequest<GedcomTreeMeta>)
			);
		},

		async putMeta(meta) {
			await withStore(META_STORE, "readwrite", (store) => {
				store.put(meta);
			});
		},

		async getAllRecords(treeId) {
			const rows = await withStore(RECORDS_STORE, "readonly", (store) => {
				const index = store.index("byTree");
				return reqToPromise(
					index.getAll(IDBKeyRange.only(treeId)) as IDBRequest<
						GedcomRecord[]
					>
				);
			});
			return (rows ?? []).sort((a, b) => a.order - b.order);
		},

		async putRecords(treeId, records) {
			await withStore(RECORDS_STORE, "readwrite", (store) => {
				for (const record of records) {
					store.put({ ...record, treeId });
				}
			});
		},

		async deleteRecords(treeId, ids) {
			await withStore(RECORDS_STORE, "readwrite", async (store) => {
				for (const id of ids) {
					store.delete([treeId, id]);
				}
			});
			await withStore(TOMBSTONES_STORE, "readwrite", (store) => {
				for (const id of ids) {
					store.put({ treeId, id } satisfies TombstoneRow);
				}
			});
		},

		async deleteTree(treeId) {
			const records = await this.getAllRecords(treeId);
			await withStore(RECORDS_STORE, "readwrite", (store) => {
				for (const record of records) {
					store.delete([treeId, record.id]);
				}
			});
			await withStore(TOMBSTONES_STORE, "readwrite", async (store) => {
				const all = await reqToPromise(
					store.getAll() as IDBRequest<TombstoneRow[]>
				);
				for (const row of all ?? []) {
					if (row.treeId === treeId) {
						store.delete([treeId, row.id]);
					}
				}
			});
			await withStore(META_STORE, "readwrite", (store) => {
				store.delete(treeId);
			});
		},

		async putTombstones(treeId, ids) {
			await withStore(TOMBSTONES_STORE, "readwrite", (store) => {
				for (const id of ids) {
					store.put({ treeId, id } satisfies TombstoneRow);
				}
			});
		},

		async clearTombstones(treeId) {
			await withStore(TOMBSTONES_STORE, "readwrite", async (store) => {
				const all = await reqToPromise(
					store.getAll() as IDBRequest<TombstoneRow[]>
				);
				for (const row of all ?? []) {
					if (row.treeId === treeId) {
						store.delete([treeId, row.id]);
					}
				}
			});
		},

		async getTombstones(treeId) {
			const all = await withStore(
				TOMBSTONES_STORE,
				"readonly",
				(store) =>
					reqToPromise(
						store.getAll() as IDBRequest<TombstoneRow[]>
					)
			);
			return (all ?? [])
				.filter((row) => row.treeId === treeId)
				.map((row) => row.id);
		},
	};
};

const indexedStores = new Map<string, GedcomStore>();

/** Tree ids stored in the `treeviz-gedcom` database (meta store). */
export const listIndexedDbGedcomTreeIds = async (
	databaseName: string = GEDCOM_STORE_DB_NAME
): Promise<string[]> => {
	if (typeof indexedDB === "undefined") {
		return [];
	}
	try {
		const db = await getDb(databaseName);
		const tx = db.transaction(META_STORE, "readonly");
		const rows = await reqToPromise(
			tx.objectStore(META_STORE).getAll() as IDBRequest<GedcomTreeMeta[]>
		);
		return (rows ?? [])
			.map((row) => row.treeId)
			.filter((id): id is string => !!id);
	} catch {
		return [];
	}
};

export const getIndexedDbGedcomStore = (
	databaseName: string = GEDCOM_STORE_DB_NAME
): GedcomStore => {
	let store = indexedStores.get(databaseName);
	if (!store) {
		store = createIndexedDbGedcomStore(databaseName);
		indexedStores.set(databaseName, store);
	}
	return store;
};
