import type { Common } from "../classes/common";
import { getValidKeys, isId } from "../classes/common";
import type { GedComType } from "../classes/gedcom";
import { createGedCom } from "../classes/gedcom";
import { List } from "../classes/list";
import type { IdType, MultiTag } from "../types/types";
import { create } from "../utils/common-creator";
import GedcomTree from "../utils/parser";

import type { LexBlock, LexResult } from "./types";
import type { GedcomNodeRecord, GedcomRecord } from "./types";

const stripAt = (id: string) => id.replace(/@/g, "");

const withAt = (id: string): IdType => {
	if (id.startsWith("@") && id.endsWith("@")) {
		return id as IdType;
	}
	return `@${id}@` as IdType;
};

/**
 * Walk a live node into a plain `GedcomNodeRecord` using the same child order
 * `toGedcomLines` walks (`getValidKeys`).
 */
export const nodeToRecord = (node: Common, tag: string): GedcomNodeRecord => {
	const record: GedcomNodeRecord = { tag };
	const value = node.exportValue?.() as string | undefined;
	if (value !== undefined && value !== null && value !== "") {
		record.value = String(value);
		if (isId(record.value)) {
			record.pointer = record.value;
		}
	}

	const children: GedcomNodeRecord[] = [];
	for (const key of getValidKeys(node)) {
		if (
			key === "id" ||
			key === "_id" ||
			key === "value" ||
			key === "_value"
		) {
			continue;
		}
		const prop = node.get(key as MultiTag);
		if (!prop) {
			continue;
		}
		if (prop instanceof List) {
			for (const item of prop.values()) {
				if (item instanceof Object && "toGedcomLines" in item) {
					children.push(
						nodeToRecord(item as Common, key as string)
					);
				}
			}
		} else if (prop instanceof Object && "toGedcomLines" in prop) {
			children.push(nodeToRecord(prop as Common, key as string));
		}
	}
	if (children.length) {
		record.children = children;
	}
	return record;
};

const findLevel0Node = (
	gedcom: GedComType,
	block: LexBlock
): Common | undefined => {
	if (block.tag === "HEAD") {
		return gedcom.get("HEAD") as Common | undefined;
	}
	const id = withAt(block.id);
	const listTag = `@@${block.tag}` as MultiTag;
	const list = gedcom.get(listTag) as List | undefined;
	if (list?.item) {
		const found = list.item(id as IdType) as Common | undefined;
		if (found) {
			return found;
		}
	}
	// Fallback: scan known list getters
	const getters: Array<() => List | undefined> = [
		() => gedcom.indis?.() as unknown as List | undefined,
		() => gedcom.fams?.() as unknown as List | undefined,
		() => gedcom.objes?.() as unknown as List | undefined,
		() => gedcom.sours?.() as unknown as List | undefined,
		() => gedcom.repos?.() as unknown as List | undefined,
		() => gedcom.subms?.() as unknown as List | undefined,
		() => gedcom.snotes?.() as unknown as List | undefined,
	];
	for (const get of getters) {
		const found = get()?.item?.(id as IdType) as Common | undefined;
		if (found) {
			return found;
		}
	}
	return undefined;
};

/**
 * Pair live level-0 nodes with lex blocks so each record keeps its exact
 * `source` slice and a serializable `node` tree.
 */
export const toRecords = (
	gedcom: GedComType,
	lexed: LexResult,
	treeId: string
): GedcomRecord[] => {
	const records: GedcomRecord[] = [];
	for (const block of lexed.blocks) {
		const live = findLevel0Node(gedcom, block);
		const node = live
			? nodeToRecord(live, block.tag)
			: { tag: block.tag };
		records.push({
			treeId,
			id: block.id,
			tag: block.tag,
			order: block.order,
			source: block.source,
			node,
		});
	}
	return records;
};

const applyNodeRecord = (
	gedcom: GedComType,
	node: Common,
	record: GedcomNodeRecord,
	xrefTypes: Map<string, MultiTag>
) => {
	if (record.value !== undefined && record.value !== "") {
		node.value = record.value;
		if (isId(record.value) && xrefTypes.has(record.value)) {
			node.refType = xrefTypes.get(record.value);
		}
	} else {
		node.removeValue?.();
	}

	const children = record.children ?? [];
	for (const child of children) {
		const tag = child.tag as MultiTag;
		const main = (node.main ?? node) as Common;
		const { prevNode } = create(gedcom, tag, undefined, {
			mainNode: main,
			curNode: node,
		});
		applyNodeRecord(gedcom, prevNode, child, xrefTypes);
		node.assign(tag, prevNode);
	}
};

const buildXrefIndex = (records: GedcomRecord[]) => {
	const xrefTypes = new Map<string, MultiTag>();
	for (const rec of records) {
		if (rec.tag === "HEAD") {
			continue;
		}
		xrefTypes.set(withAt(rec.id), rec.tag as MultiTag);
	}
	return xrefTypes;
};

/**
 * Hydrate a live `GedCom` from stored records. Uses the same `create` +
 * `addToList` path as parse / `fromObject`.
 */
export const fromRecords = (
	records: GedcomRecord[],
	_options?: { filename?: string }
): GedComType => {
	const sorted = [...records].sort((a, b) => a.order - b.order);
	const gedcom = createGedCom();
	gedcom.removeValue();
	const xrefTypes = buildXrefIndex(sorted);

	for (const rec of sorted) {
		if (rec.tag === "HEAD") {
			const { prevNode } = create(gedcom, "HEAD" as MultiTag);
			gedcom.assign("HEAD" as MultiTag, prevNode);
			applyNodeRecord(gedcom, prevNode, rec.node, xrefTypes);
			continue;
		}
		const id = withAt(rec.id);
		const { prevNode } = create(gedcom, rec.tag as MultiTag, id);
		GedcomTree.addToList(id, rec.tag as MultiTag, gedcom, prevNode);
		applyNodeRecord(gedcom, prevNode, rec.node, xrefTypes);
	}

	return gedcom;
};

/**
 * Replace a record's `source` with the serializer output for that level-0 node.
 * Used after a mutation so dirty records emit rewritten lines while clean
 * records keep their imported slice.
 */
export const serializeRecordSource = (
	node: Common,
	tag: string,
	id: string,
	newline: string
): string => {
	const lines: string[] = [];
	if (tag === "HEAD") {
		lines.push(`0 HEAD`);
		const childLines = node.toGedcomLines(
			"HEAD" as MultiTag,
			1,
			{ original: true }
		);
		lines.push(...childLines);
	} else {
		const xref = withAt(id);
		const payload = node.exportValue?.() as string | undefined;
		lines.push(
			`0 ${xref} ${tag}${payload ? ` ${payload}` : ""}`
		);
		const childLines = node.toGedcomLines(
			tag as MultiTag,
			1,
			{ original: true }
		);
		lines.push(...childLines);
	}
	const body = lines.join(newline);
	return body.endsWith(newline) ? body : `${body}${newline}`;
};

export const recordKeyWithoutAt = stripAt;
