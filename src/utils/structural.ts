import type { Common } from "../classes/common";
import { getValidKeys, isId } from "../classes/common";
import type { GedComType } from "../classes/gedcom";
import type { ConvertOptions } from "../interfaces/common";
import type { MultiTag, IdType } from "../types/types";
import { create } from "./common-creator";
import GedcomTree, { createEmptyGedcom } from "./parser";

export const STRUCTURAL_FORMAT = "treeviz-structural" as const;
export const STRUCTURAL_VERSION = 1 as const;

export type StructuralEnvelope = {
	v: typeof STRUCTURAL_VERSION;
	format: typeof STRUCTURAL_FORMAT;
	data: Record<string, unknown>;
};

const ROOT_SKIP_KEYS = new Set(["HEAD"]);

const SKIP_KEYS = new Set(["id"]);

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
	if (value === undefined || value === null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isRecordItem = (
	value: unknown
): value is Record<string, unknown> & { id: string } =>
	isPlainObject(value) && typeof value.id === "string";

/**
 * Top-level record collections in persist payload order (same as `toObject`
 * key order from parse). Includes custom tags e.g. CONTACT / OCCUPATION.
 * HEAD is handled separately.
 */
const topLevelRecordTags = (data: Record<string, unknown>): MultiTag[] => {
	const found: MultiTag[] = [];
	for (const key of Object.keys(data)) {
		if (ROOT_SKIP_KEYS.has(key)) {
			continue;
		}
		if (asArray(data[key]).some(isRecordItem)) {
			found.push(key as MultiTag);
		}
	}
	return found;
};

const clearNodeChildren = (node: Common) => {
	for (const key of getValidKeys(node)) {
		if (
			key === "id" ||
			key === "_id" ||
			key === "value" ||
			key === "_value"
		) {
			continue;
		}
		node.remove(key as MultiTag);
	}
	if ("value" in node) {
		delete (node as { value?: unknown }).value;
	}
	if ("_value" in node) {
		delete (node as { _value?: unknown })._value;
	}
};

export const isStructuralEnvelope = (
	content: string
): content is string => {
	const trimmed = content.trimStart();
	return (
		trimmed.startsWith("{") &&
		trimmed.includes(`"format":"${STRUCTURAL_FORMAT}"`)
	);
};

export const parseStructuralEnvelope = (
	content: string
): StructuralEnvelope | undefined => {
	try {
		const parsed = JSON.parse(content) as Partial<StructuralEnvelope>;
		if (
			parsed?.format === STRUCTURAL_FORMAT &&
			parsed.v === STRUCTURAL_VERSION &&
			parsed.data &&
			typeof parsed.data === "object"
		) {
			return parsed as StructuralEnvelope;
		}
	} catch {
		// not JSON
	}
	return undefined;
};

/**
 * Persist live tree without GEDCOM text. Firebase/IDB store this envelope.
 * Export/download still uses `toGedcom`.
 */
export const serializeStructural = (
	gedcom: GedComType,
	options?: ConvertOptions
): string => {
	const data = gedcom.toObject(undefined, {
		...options,
		persist: true,
	}) as Record<string, unknown>;
	const envelope: StructuralEnvelope = {
		v: STRUCTURAL_VERSION,
		format: STRUCTURAL_FORMAT,
		data,
	};
	return JSON.stringify(envelope);
};

const buildXrefIndex = (data: Record<string, unknown>) => {
	const xrefTypes = new Map<string, MultiTag>();
	for (const tag of topLevelRecordTags(data)) {
		for (const item of asArray(data[tag])) {
			if (isRecordItem(item)) {
				xrefTypes.set(item.id, tag);
			}
		}
	}
	return xrefTypes;
};

const applyValue = (
	node: Common,
	value: string,
	xrefTypes: Map<string, MultiTag>
) => {
	node.value = value;
	if (isId(value) && xrefTypes.has(value)) {
		node.refType = xrefTypes.get(value);
	}
};

const DERIVED_NAME_PARTS = new Set([
	"GIVN",
	"SURN",
	"NSFX",
	"NICK",
	"NPFX",
	"DISPLAY",
	"FORMAT",
]);

const applyProps = (
	gedcom: GedComType,
	node: Common,
	props: Record<string, unknown>,
	xrefTypes: Map<string, MultiTag>
) => {
	// Apply `value` first so NAME/DATE parsers run, then restore explicit
	// child tags (GIVN/SURN, DAY/MONTH/YEAR, …) so they match parse().
	const providedKeys = new Set(Object.keys(props));
	const entries = Object.entries(props);
	const ordered = [
		...entries.filter(([key]) => key === "value"),
		...entries.filter(([key]) => key !== "value"),
	];

	ordered.forEach(([key, value]) => {
		if (SKIP_KEYS.has(key)) {
			return;
		}
		if (key === "value") {
			if (
				value === null ||
				value === undefined ||
				typeof value === "object"
			) {
				return;
			}
			applyValue(node, String(value), xrefTypes);
			return;
		}

		const tag = key as MultiTag;
		const main = (node.main ?? node) as Common;

		const addOne = (childProps: Record<string, unknown> | string) => {
			if (typeof childProps === "string") {
				const { prevNode } = create(gedcom, tag, undefined, {
					mainNode: main,
					curNode: node,
				});
				applyValue(prevNode, childProps, xrefTypes);
				node.assign(tag, prevNode);
				return;
			}
			const { prevNode } = create(gedcom, tag, undefined, {
				mainNode: main,
				curNode: node,
			});
			applyProps(gedcom, prevNode, childProps, xrefTypes);
			node.assign(tag, prevNode);
		};

		if (value === null || value === undefined) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((item) => {
				if (typeof item === "string") {
					addOne(item);
				} else if (isPlainObject(item)) {
					addOne(item);
				}
			});
			return;
		}

		if (typeof value === "string" || typeof value === "number") {
			addOne(String(value));
			return;
		}

		if (isPlainObject(value)) {
			// Replace a single child that the value-setter may have created
			// (e.g. NAME → GIVN) so explicit persist props win.
			const existing = node.get(tag);
			if (existing && !(existing as { length?: number }).length) {
				node.remove(tag);
			}
			addOne(value);
		}
	});

	// Drop NAME parts that were not in the persist payload (live edits may
	// only store NAME.value). Keep DATE DAY/MONTH/YEAR — removing them
	// reformats DATE.value and breaks toGedcom parity.
	if (providedKeys.has("value")) {
		for (const derived of DERIVED_NAME_PARTS) {
			if (!providedKeys.has(derived) && node.get(derived as MultiTag)) {
				node.remove(derived as MultiTag);
			}
		}
	}
};

const applyHead = (
	gedcom: GedComType,
	data: Record<string, unknown>,
	xrefTypes: Map<string, MultiTag>
) => {
	const headNode = gedcom.get("HEAD");
	if (isPlainObject(data.HEAD)) {
		if (headNode) {
			clearNodeChildren(headNode);
			applyProps(gedcom, headNode, data.HEAD, xrefTypes);
		}
		return;
	}
	// Source had no HEAD — drop the empty-gedcom default so we match parse().
	if (headNode) {
		gedcom.remove("HEAD");
	}
};

const yieldToMain = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

const rebuildFromObjectData = (data: Record<string, unknown>): GedComType => {
	const gedcom = createEmptyGedcom();
	const xrefTypes = buildXrefIndex(data);
	applyHead(gedcom, data, xrefTypes);

	for (const tag of topLevelRecordTags(data)) {
		for (const item of asArray(data[tag])) {
			if (!isRecordItem(item)) {
				continue;
			}
			const id = item.id as IdType;
			const { prevNode } = create(gedcom, tag, id);
			GedcomTree.addToList(id, tag, gedcom, prevNode);
			applyProps(gedcom, prevNode, item, xrefTypes);
		}
	}

	return gedcom;
};

/**
 * Rebuild a live GedCom from `toObject(..., { persist: true })` output.
 * Uses typed `create` + `addToList` (not `applyObject`).
 */
export const fromObject = (data: Record<string, unknown>): GedComType =>
	rebuildFromObjectData(data);

/**
 * Same as `fromObject`, but yields to the event loop every `yieldEvery` records
 * so cold-start hydrate does not freeze the UI for multi-second stretches.
 */
export const fromObjectAsync = async (
	data: Record<string, unknown>,
	options?: { yieldEvery?: number; signal?: AbortSignal }
): Promise<GedComType> => {
	const yieldEvery = options?.yieldEvery ?? 40;
	const signal = options?.signal;
	const gedcom = createEmptyGedcom();
	const xrefTypes = buildXrefIndex(data);
	applyHead(gedcom, data, xrefTypes);

	let n = 0;
	for (const tag of topLevelRecordTags(data)) {
		for (const item of asArray(data[tag])) {
			if (signal?.aborted) {
				throw new DOMException("Aborted", "AbortError");
			}
			if (!isRecordItem(item)) {
				continue;
			}
			const id = item.id as IdType;
			const { prevNode } = create(gedcom, tag, id);
			GedcomTree.addToList(id, tag, gedcom, prevNode);
			applyProps(gedcom, prevNode, item, xrefTypes);
			n += 1;
			if (n % yieldEvery === 0) {
				await yieldToMain();
			}
		}
	}

	return gedcom;
};

/**
 * Hydrate from either structural envelope JSON or classic GEDCOM text.
 */
export const hydrateFromContent = (
	content: string,
	options?: Parameters<typeof GedcomTree.parse>[1]
): GedComType => {
	const envelope = parseStructuralEnvelope(content);
	if (envelope) {
		return fromObject(envelope.data);
	}
	const { gedcom } = GedcomTree.parse(content, options);
	if (!gedcom) {
		throw new Error("Unable to parse GEDCOM content");
	}
	return gedcom;
};

/**
 * Prefer for login / cold start. Structural trees yield during fromObject;
 * classic GEDCOM still parses in one turn after a paint yield.
 */
export const hydrateFromContentAsync = async (
	content: string,
	options?: Parameters<typeof GedcomTree.parse>[1] & {
		yieldEvery?: number;
		signal?: AbortSignal;
	}
): Promise<GedComType> => {
	await yieldToMain();
	if (options?.signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}
	const envelope = parseStructuralEnvelope(content);
	if (envelope) {
		return fromObjectAsync(envelope.data, {
			yieldEvery: options?.yieldEvery,
			signal: options?.signal,
		});
	}
	return hydrateFromContent(content, options);
};
