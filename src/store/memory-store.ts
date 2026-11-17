import type {
	GedcomRecord,
	GedcomStore,
	GedcomTreeMeta,
} from "./types";

type TreeBucket = {
	meta: GedcomTreeMeta;
	records: Map<string, GedcomRecord>;
	tombstones: Set<string>;
};

const globalTrees = new Map<string, TreeBucket>();

const ensureBucket = (treeId: string, meta?: GedcomTreeMeta): TreeBucket => {
	let bucket = globalTrees.get(treeId);
	if (!bucket) {
		bucket = {
			meta: meta ?? {
				treeId,
				revision: 0,
				bom: "",
				trailer: "0 TRLR\n",
				recordCount: 0,
				updatedAt: Date.now(),
			},
			records: new Map(),
			tombstones: new Set(),
		};
		globalTrees.set(treeId, bucket);
	}
	return bucket;
};

/**
 * In-process Map store. Used by tests, CLI, Cloud Functions, and `fork()`.
 * Never touches IndexedDB.
 */
export const createMemoryGedcomStore = (): GedcomStore => {
	return {
		async getMeta(treeId) {
			return globalTrees.get(treeId)?.meta;
		},

		async putMeta(meta) {
			const bucket = ensureBucket(meta.treeId, meta);
			bucket.meta = { ...meta };
		},

		async getAllRecords(treeId) {
			const bucket = globalTrees.get(treeId);
			if (!bucket) {
				return [];
			}
			return [...bucket.records.values()].sort(
				(a, b) => a.order - b.order
			);
		},

		async putRecords(treeId, records) {
			const bucket = ensureBucket(treeId);
			for (const record of records) {
				bucket.records.set(record.id, { ...record, treeId });
				bucket.tombstones.delete(record.id);
			}
			bucket.meta.recordCount = bucket.records.size;
			bucket.meta.updatedAt = Date.now();
		},

		async deleteRecords(treeId, ids) {
			const bucket = globalTrees.get(treeId);
			if (!bucket) {
				return;
			}
			for (const id of ids) {
				bucket.records.delete(id);
				bucket.tombstones.add(id);
			}
			bucket.meta.recordCount = bucket.records.size;
			bucket.meta.updatedAt = Date.now();
		},

		async deleteTree(treeId) {
			globalTrees.delete(treeId);
		},

		async putTombstones(treeId, ids) {
			const bucket = ensureBucket(treeId);
			for (const id of ids) {
				bucket.tombstones.add(id);
			}
		},

		async clearTombstones(treeId) {
			const bucket = globalTrees.get(treeId);
			if (bucket) {
				bucket.tombstones.clear();
			}
		},

		async getTombstones(treeId) {
			const bucket = globalTrees.get(treeId);
			return bucket ? [...bucket.tombstones] : [];
		},
	};
};

/** Shared singleton for `memory://` connections in this JS realm. */
let sharedMemoryStore: GedcomStore | undefined;

export const getSharedMemoryStore = (): GedcomStore => {
	if (!sharedMemoryStore) {
		sharedMemoryStore = createMemoryGedcomStore();
	}
	return sharedMemoryStore;
};

/** Drop every memory tree (tests). */
export const resetSharedMemoryStore = () => {
	globalTrees.clear();
	sharedMemoryStore = createMemoryGedcomStore();
};
