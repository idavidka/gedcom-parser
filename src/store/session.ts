import type { Common } from "../classes/common";
import {
	createProxy,
	registerStoreDirtyHandler,
} from "../classes/common";
import type { GedComType } from "../classes/gedcom";

import { parseConnection, connectionLockName } from "./connection";
import { getIndexedDbGedcomStore } from "./indexed-db-store";
import { concatenateSources } from "./lex";
import { getSharedMemoryStore } from "./memory-store";
import {
	fromRecords,
	nodeToRecord,
	serializeRecordSource,
} from "./records";
import type {
	BroadcastMessage,
	FlushResult,
	GedcomRecord,
	GedcomStore,
	GedcomTreeMeta,
	StoreLink,
} from "./types";
import { GEDCOM_STORE_CHANNEL } from "./types";

const storeLinks = new WeakMap<object, StoreLink>();
const openSessions = new Map<string, { gedcom: GedComType; link: StoreLink }>();

export const getStoreLink = (target: object): StoreLink | undefined =>
	storeLinks.get(target);

export const attachStoreLink = (gedcom: GedComType, link: StoreLink) => {
	storeLinks.set(gedcom as object, link);
	openSessions.set(link.connection, { gedcom, link });
};

export const detachStoreLink = (connection: string) => {
	const session = openSessions.get(connection);
	if (session) {
		storeLinks.delete(session.gedcom as object);
		openSessions.delete(connection);
	}
};

/** Drop open sessions so a later flush cannot rewrite IndexedDB. */
export const discardOpenGedcomStores = (): void => {
	gedcomStoresDiscarded = true;
	for (const connection of [...openSessions.keys()]) {
		detachStoreLink(connection);
	}
};

export const getOpenSession = (connection: string) =>
	openSessions.get(connection);

export const resolveStore = (connection: string): GedcomStore => {
	const parsed = parseConnection(connection);
	if (parsed.backend === "memory") {
		return getSharedMemoryStore();
	}
	return getIndexedDbGedcomStore(parsed.database);
};

const detectNewline = (source: string) =>
	source.includes("\r\n") ? "\r\n" : "\n";

const level0Id = (node: Common): string | undefined => {
	let cur: Common | undefined = node;
	while (cur?.parent) {
		cur = cur.parent as Common;
	}
	if (!cur) {
		return undefined;
	}
	if (cur.type === "HEAD" || (!cur.id && cur.getGedcom()?.HEAD === cur)) {
		return "HEAD";
	}
	const id = cur.id;
	if (typeof id === "string" && id) {
		return id.replace(/@/g, "");
	}
	return undefined;
};

/** Mark the owning level-0 record dirty on the store link. */
export const markDirty = (node: Common, link: StoreLink) => {
	const id = level0Id(node);
	if (!id) {
		return;
	}
	link.dirty.add(id);
	link.deleted.delete(id);
	link.cleanExport = false;
	scheduleAutoFlush(link);
};

export const markDeleted = (id: string, link: StoreLink) => {
	link.deleted.add(id);
	link.dirty.delete(id);
	link.cache.delete(id);
	link.nodes.delete(id);
	link.cleanExport = false;
	scheduleAutoFlush(link);
};

const pendingFlush = new WeakMap<StoreLink, Promise<FlushResult>>();

type FlushListener = (treeId: string, result: FlushResult) => void;
let flushListener: FlushListener | undefined;
let gedcomStoresDiscarded = false;

/** App hook: every IndexedDB flush (auto or explicit) can push tree_records. */
export const setGedcomFlushListener = (
	listener: FlushListener | undefined
): void => {
	flushListener = listener;
};

const scheduleAutoFlush = (link: StoreLink) => {
	if (gedcomStoresDiscarded || link.isFork) {
		return;
	}
	if (pendingFlush.has(link)) {
		return;
	}
	const promise = Promise.resolve().then(() => flushStoreLink(link));
	pendingFlush.set(link, promise);
	promise.finally(() => {
		if (pendingFlush.get(link) === promise) {
			pendingFlush.delete(link);
		}
	});
};

const withLock = async <T>(
	treeId: string,
	fn: () => Promise<T>
): Promise<T> => {
	const locks = (
		globalThis as { navigator?: { locks?: LockManager } }
	).navigator?.locks;
	if (!locks?.request) {
		return fn();
	}
	return locks.request(connectionLockName(treeId), fn);
};

const getBroadcast = (): BroadcastChannel | undefined => {
	if (typeof BroadcastChannel === "undefined") {
		return undefined;
	}
	try {
		return new BroadcastChannel(GEDCOM_STORE_CHANNEL);
	} catch {
		return undefined;
	}
};

let broadcast: BroadcastChannel | undefined;
const ensureBroadcast = () => {
	if (!broadcast) {
		broadcast = getBroadcast();
		broadcast?.addEventListener("message", (event) => {
			const data = event.data as BroadcastMessage | undefined;
			if (!data?.connection) {
				return;
			}
			const session = openSessions.get(data.connection);
			if (!session || session.link.isFork) {
				return;
			}
			applyBroadcast(session.link, session.gedcom, data);
		});
	}
	return broadcast;
};

const applyBroadcast = (
	link: StoreLink,
	_gedcom: GedComType,
	msg: BroadcastMessage
) => {
	if (msg.revision <= link.revision) {
		return;
	}
	for (const record of msg.upserts) {
		link.cache.set(record.id, record);
		link.nodes.delete(record.id);
	}
	for (const id of msg.deletes) {
		link.cache.delete(id);
		link.nodes.delete(id);
	}
	link.revision = msg.revision;
	link.meta.revision = msg.revision;
};

export class RevisionConflictError extends Error {
	constructor(message = "GEDCOM store revision moved; reload and retry") {
		super(message);
		this.name = "RevisionConflictError";
	}
}

/**
 * Flush dirty level-0 records to the backing store.
 */
export const flushStoreLink = async (
	link: StoreLink,
	gedcom?: GedComType
): Promise<FlushResult> => {
	if (gedcomStoresDiscarded || link.isFork) {
		return { revision: link.revision, upserts: [], deletes: [] };
	}

	const session = gedcom
		? { gedcom, link }
		: openSessions.get(link.connection);
	if (!session) {
		return { revision: link.revision, upserts: [], deletes: [] };
	}

	const dirtyIds = [...link.dirty];
	const deleteIds = [...link.deleted];
	if (!dirtyIds.length && !deleteIds.length) {
		return { revision: link.revision, upserts: [], deletes: [] };
	}

	ensureBroadcast();

	return withLock(link.treeId, async () => {
		if (gedcomStoresDiscarded) {
			return { revision: link.revision, upserts: [], deletes: [] };
		}
		const store = resolveStore(link.connection);
		const remoteMeta = await store.getMeta(link.treeId);
		if (
			remoteMeta &&
			remoteMeta.revision > link.revision &&
			(link.dirty.size || link.deleted.size)
		) {
			// Reload and abort — do not merge dirty caches in v1.
			const records = await store.getAllRecords(link.treeId);
			link.cache.clear();
			for (const record of records) {
				link.cache.set(record.id, record);
			}
			link.nodes.clear();
			link.revision = remoteMeta.revision;
			link.meta = remoteMeta;
			link.dirty.clear();
			link.deleted.clear();
			throw new RevisionConflictError();
		}

		const newline = detectNewline(
			link.meta.trailer ||
				[...link.cache.values()][0]?.source ||
				"\n"
		);

		const resolveLive = (id: string): Common | undefined => {
			if (id === "HEAD") {
				return session.gedcom.get("HEAD") as Common | undefined;
			}
			const xref = id.startsWith("@") ? id : `@${id}@`;
			return (
				(session.gedcom.indi?.(xref) as Common | undefined) ??
				(session.gedcom.fam?.(xref) as Common | undefined) ??
				(session.gedcom.obje?.(xref) as Common | undefined) ??
				(session.gedcom.sour?.(xref) as Common | undefined) ??
				(session.gedcom.repo?.(xref) as Common | undefined) ??
				(session.gedcom.subm?.(xref) as Common | undefined) ??
				(session.gedcom.snote?.(xref) as Common | undefined) ??
				(link.nodes.get(id) as Common | undefined)
			);
		};

		// Records removed from the live graph since the last flush.
		// If the graph cannot see the store (filtered list, failed lookup),
		// do not wipe IndexedDB.
		const missing: string[] = [];
		for (const id of link.cache.keys()) {
			if (id === "HEAD") {
				continue;
			}
			if (!resolveLive(id) && !deleteIds.includes(id)) {
				missing.push(id);
			}
		}
		const storedCount = Math.max(1, link.cache.size - 1);
		if (missing.length > 0 && missing.length < storedCount) {
			deleteIds.push(...missing);
		}

		const upserts: GedcomRecord[] = [];
		for (const id of dirtyIds) {
			if (deleteIds.includes(id)) {
				continue;
			}
			const live = resolveLive(id);
			const existing = link.cache.get(id);
			const tag = existing?.tag ?? (live?.type as string) ?? "INDI";
			if (!live) {
				deleteIds.push(id);
				continue;
			}
			const node = nodeToRecord(live, tag);
			const source = serializeRecordSource(live, tag, id, newline);
			const order = existing?.order ?? link.cache.size;
			const record: GedcomRecord = {
				treeId: link.treeId,
				id,
				tag,
				order,
				source,
				node,
			};
			link.cache.set(id, record);
			upserts.push(record);
		}

		await store.putRecords(link.treeId, upserts);
		if (deleteIds.length) {
			await store.deleteRecords(link.treeId, deleteIds);
			for (const id of deleteIds) {
				link.cache.delete(id);
				link.nodes.delete(id);
			}
		}

		const nextRevision = link.revision + 1;
		const meta: GedcomTreeMeta = {
			...link.meta,
			revision: nextRevision,
			recordCount: link.cache.size,
			updatedAt: Date.now(),
		};
		await store.putMeta(meta);
		await store.clearTombstones(link.treeId);

		link.revision = nextRevision;
		link.meta = meta;
		link.dirty.clear();
		link.deleted.clear();

		const message: BroadcastMessage = {
			connection: link.connection,
			revision: nextRevision,
			upserts,
			deletes: deleteIds,
		};
		ensureBroadcast()?.postMessage(message);

		const flushed = {
			revision: nextRevision,
			upserts,
			deletes: deleteIds,
		};
		try {
			flushListener?.(link.treeId, flushed);
		} catch {
			// The cloud bridge must not fail the local flush.
		}
		return flushed;
	});
};

/**
 * Clean export: concatenate source slices. Dirty trees fall back to the
 * rewriting serializer via the normal `toGedcom` path.
 */
export const exportFromStoreLink = (link: StoreLink): string | undefined => {
	if (!link.cleanExport || link.dirty.size || link.deleted.size) {
		return undefined;
	}
	return concatenateSources(
		link.meta.bom,
		[...link.cache.values()],
		link.meta.trailer
	);
};

export const buildStoreLink = (args: {
	connection: string;
	treeId: string;
	meta: GedcomTreeMeta;
	records: GedcomRecord[];
	cleanExport?: boolean;
	isFork?: boolean;
}): StoreLink => {
	const cache = new Map<string, GedcomRecord>();
	for (const record of args.records) {
		cache.set(record.id, record);
	}
	return {
		connection: args.connection,
		treeId: args.treeId,
		revision: args.meta.revision,
		cache,
		nodes: new Map(),
		dirty: new Set(),
		deleted: new Set(),
		meta: args.meta,
		cleanExport: args.cleanExport ?? true,
		isFork: args.isFork,
	};
};

/**
 * Wrap a hydrated gedcom with store-aware proxy behaviour and clean export.
 */
export const connectGedcom = (
	gedcom: GedComType,
	link: StoreLink
): GedComType => {
	const storeForProxy = {
		dirty: link.dirty,
		deleted: link.deleted,
		cleanExport: link.cleanExport,
		isFork: link.isFork,
		markDirty: (node: Common) => markDirty(node, link),
	};

	const proxied = createProxy(
		gedcom as unknown as Common,
		storeForProxy
	) as unknown as GedComType;

	registerStoreDirtyHandler(proxied as object, (node) =>
		markDirty(node, link)
	);
	// Also register the unwrapped root so nested `_gedcom` lookups hit.
	registerStoreDirtyHandler(gedcom as object, (node) =>
		markDirty(node, link)
	);

	const originalToGedcom = gedcom.toGedcom.bind(gedcom);
	proxied.toGedcom = ((
		tag?: Parameters<GedComType["toGedcom"]>[0],
		level?: Parameters<GedComType["toGedcom"]>[1],
		options?: Parameters<GedComType["toGedcom"]>[2]
	) => {
		const wantsRewrite =
			options?.gedcomVersion !== undefined ||
			options?.indis !== undefined ||
			(options && options.original === false) ||
			options?.super === true;
		if (!wantsRewrite) {
			const clean = exportFromStoreLink(link);
			if (clean !== undefined) {
				return clean;
			}
		}
		return originalToGedcom(tag, level, options);
	}) as GedComType["toGedcom"];

	(proxied as GedComType & { flush: () => Promise<FlushResult> }).flush =
		async () => flushStoreLink(link, proxied);

	(proxied as GedComType & { fork: () => GedComType }).fork = () => {
		const forkId = `fork-${Date.now().toString(36)}-${Math.random()
			.toString(36)
			.slice(2, 8)}`;
		const forkConnection = `memory://${forkId}`;
		const records = [...link.cache.values()].map((r) => ({
			...r,
			treeId: forkId,
		}));
		const forkGedcom = fromRecords(records);
		const forkLink = buildStoreLink({
			connection: forkConnection,
			treeId: forkId,
			meta: {
				...link.meta,
				treeId: forkId,
				revision: 0,
			},
			records,
			cleanExport: link.cleanExport,
			isFork: true,
		});
		return connectGedcom(forkGedcom, forkLink);
	};

	(proxied as GedComType & {
		applyRemoteRecords: (
			upserts: GedcomRecord[],
			deletes?: string[]
		) => void;
	}).applyRemoteRecords = (upserts, deletes = []) => {
		for (const record of upserts) {
			link.cache.set(record.id, record);
			link.nodes.delete(record.id);
		}
		for (const id of deletes) {
			link.cache.delete(id);
			link.nodes.delete(id);
		}
		const rebuilt = fromRecords([...link.cache.values()]);
		Object.keys(proxied).forEach((key) => {
			if (key.startsWith("@@") || key === "HEAD") {
				delete (proxied as Record<string, unknown>)[key];
			}
		});
		Object.assign(proxied, rebuilt);
		link.cleanExport = false;
	};

	attachStoreLink(proxied, link);
	ensureBroadcast();
	return proxied;
};

export type ConnectedGedCom = GedComType & {
	flush: () => Promise<FlushResult>;
	fork: () => ConnectedGedCom;
	applyRemoteRecords: (
		upserts: GedcomRecord[],
		deletes?: string[]
	) => void;
};
