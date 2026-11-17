import { getGedcomConnection } from "../factories/gedcom-connection";

import type { ParsedConnection, StoreBackend } from "./types";
import { GEDCOM_STORE_DB_NAME } from "./types";

const INDEXEDDB_PREFIX = "indexeddb://";
const MEMORY_PREFIX = "memory://";

/**
 * Parse a connection string into backend + treeId.
 *
 * Forms:
 * - `indexeddb://<database>/<treeId>`
 * - `memory://<treeId>`
 * - `<treeId>` — resolved against `setGedcomConnection` default prefix
 */
export const parseConnection = (
	input: string,
	defaultPrefix?: string
): ParsedConnection => {
	const raw = input.trim();
	if (!raw) {
		throw new Error("GEDCOM connection string is empty");
	}

	if (raw.startsWith(MEMORY_PREFIX)) {
		const treeId = raw.slice(MEMORY_PREFIX.length);
		if (!treeId) {
			throw new Error("memory:// connection requires a treeId");
		}
		return {
			backend: "memory",
			treeId,
			connection: `${MEMORY_PREFIX}${treeId}`,
		};
	}

	if (raw.startsWith(INDEXEDDB_PREFIX)) {
		const rest = raw.slice(INDEXEDDB_PREFIX.length);
		const slash = rest.indexOf("/");
		if (slash <= 0 || slash === rest.length - 1) {
			throw new Error(
				`indexeddb:// connection must be indexeddb://<database>/<treeId>, got: ${raw}`
			);
		}
		const database = rest.slice(0, slash);
		const treeId = rest.slice(slash + 1);
		return {
			backend: "indexeddb",
			database,
			treeId,
			connection: `${INDEXEDDB_PREFIX}${database}/${treeId}`,
		};
	}

	const prefix =
		defaultPrefix ?? getGedcomConnection() ?? `${INDEXEDDB_PREFIX}${GEDCOM_STORE_DB_NAME}`;
	return parseConnection(`${prefix.replace(/\/$/, "")}/${raw}`, undefined);
};

export const connectionLockName = (treeId: string) =>
	`treeviz-gedcom:${treeId}`;

export const isMemoryConnection = (connection: string) =>
	connection.startsWith(MEMORY_PREFIX);

export const backendOf = (connection: string): StoreBackend =>
	parseConnection(connection).backend;
