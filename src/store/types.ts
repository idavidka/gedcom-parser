/**
 * Plain, structured-cloneable GEDCOM records for IndexedDB / memory store.
 * Not the display/export projection (`toObject` / `toJson`).
 */

export type GedcomNodeRecord = {
	tag: string;
	/** Payload after the tag. Pointers are the xref text, not a live object. */
	value?: string;
	/** Present when the line is an xref pointer (FAMC, FAMS, HUSB, WIFE, CHIL, …). */
	pointer?: string;
	children?: GedcomNodeRecord[];
};

export type GedcomRecord = {
	treeId: string;
	/** Xref without @, or the synthetic id "HEAD". The trailer is a meta slice. */
	id: string;
	tag: string;
	/** File order among level-0 records. Export walks this. */
	order: number;
	/**
	 * Exact imported substring for this block, including its line breaks.
	 * Clean export writes this. A mutation replaces it for this record only.
	 */
	source: string;
	node: GedcomNodeRecord;
};

export type GedcomTreeMeta = {
	treeId: string;
	revision: number;
	/** Exact leading bytes (UTF-8 BOM if present). */
	bom: string;
	/** Exact trailer slice (`0 TRLR` plus its newline, or empty). */
	trailer: string;
	filename?: string;
	gedcomVersion?: string;
	fingerprint?: string;
	updatedAt?: number;
	recordCount?: number;
};

export type LexBlock = {
	id: string;
	tag: string;
	order: number;
	/** Exact substring of the imported text for this level-0 block. */
	source: string;
	/**
	 * Logical lines for the builder (CONC folded, FILE inject applied when
	 * building from lex — not used for clean export).
	 */
	logicalLines: string[];
};

export type LexResult = {
	bom: string;
	trailer: string;
	blocks: LexBlock[];
	/** Full body after BOM strip (for size / purge checks). */
	body: string;
};

export type StoreBackend = "memory" | "indexeddb";

export type ParsedConnection = {
	backend: StoreBackend;
	/** IndexedDB database name when backend is indexeddb. */
	database?: string;
	treeId: string;
	/** Canonical connection string including backend. */
	connection: string;
};

export type StoreLink = {
	connection: string;
	treeId: string;
	revision: number;
	/** Level-0 records loaded for this connection. The trap reads this, not IDB. */
	cache: Map<string, GedcomRecord>;
	/** Materialized nodes, so the second get of @I1@ is the same object. */
	nodes: Map<string, unknown>;
	dirty: Set<string>;
	deleted: Set<string>;
	meta: GedcomTreeMeta;
	/** When true, clean toGedcom concatenates source slices. */
	cleanExport: boolean;
	/** Fork proxies skip locks and broadcasts. */
	isFork?: boolean;
};

export type FlushResult = {
	revision: number;
	upserts: GedcomRecord[];
	deletes: string[];
};

export type GedcomStore = {
	getMeta(treeId: string): Promise<GedcomTreeMeta | undefined>;
	putMeta(meta: GedcomTreeMeta): Promise<void>;
	getAllRecords(treeId: string): Promise<GedcomRecord[]>;
	putRecords(treeId: string, records: GedcomRecord[]): Promise<void>;
	deleteRecords(treeId: string, ids: string[]): Promise<void>;
	deleteTree(treeId: string): Promise<void>;
	putTombstones(treeId: string, ids: string[]): Promise<void>;
	clearTombstones(treeId: string): Promise<void>;
	getTombstones(treeId: string): Promise<string[]>;
};

export type BroadcastMessage = {
	connection: string;
	revision: number;
	upserts: GedcomRecord[];
	deletes: string[];
};

export const GEDCOM_STORE_DB_NAME = "treeviz-gedcom";
export const GEDCOM_STORE_CHANNEL = "treeviz-gedcom";
export const GEDCOM_STORE_VERSION = 1;
