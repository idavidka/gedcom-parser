/**
 * GEDCOM 7 HEAD.SCHMA helpers for documented extension tags.
 * Spec: https://gedcom.io/specifications/FamilySearchGEDCOMv7.html
 */

import type { Common } from "../classes/common";
import { createCommon } from "../classes/common";
import type { GedComType } from "../classes/gedcom";

/** Well-known TreeViz / vendor extension tags → stable URIs. */
export const TREEVIZ_EXTENSION_URIS: Record<string, string> = {
	_ORIGHEAD: "https://treeviz.com/gedcom#_ORIGHEAD",
	_TREE: "https://treeviz.com/gedcom#_TREE",
	_TID: "https://treeviz.com/gedcom#_TID",
	_PRIM: "https://treeviz.com/gedcom#_PRIM",
	_FREL: "https://treeviz.com/gedcom#_FREL",
	_MREL: "https://treeviz.com/gedcom#_MREL",
	_UID: "https://treeviz.com/gedcom#_UID",
	_WLNK: "https://treeviz.com/gedcom#_WLNK",
	_MTTAG: "https://treeviz.com/gedcom#_MTTAG",
	_MTCAT: "https://treeviz.com/gedcom#_MTCAT",
	_CLON: "https://treeviz.com/gedcom#_CLON",
	_MSER: "https://treeviz.com/gedcom#_MSER",
	_OID: "https://treeviz.com/gedcom#_OID",
	_LKID: "https://treeviz.com/gedcom#_LKID",
	_PHOTO_RIN: "https://treeviz.com/gedcom#_PHOTO_RIN",
	_EXPORTED_FROM_SITE_ID: "https://treeviz.com/gedcom#_EXPORTED_FROM_SITE_ID",
};

const parseTagDefinition = (payload: string) => {
	const trimmed = payload.trim();
	const space = trimmed.indexOf(" ");
	if (space <= 0) {
		return undefined;
	}
	const tag = trimmed.slice(0, space).trim();
	const uri = trimmed.slice(space + 1).trim();
	if (!tag || !uri) {
		return undefined;
	}
	return { tag, uri };
};

/**
 * Read HEAD.SCHMA TAG definitions as tag → URI.
 */
export const getExtensionSchema = (gedcom: GedComType) => {
	const map = new Map<string, string>();
	const schma = gedcom.get("HEAD")?.get("SCHMA");
	if (!schma) {
		return map;
	}

	schma
		.get("TAG")
		?.toList()
		?.forEach((tagNode) => {
			const payload = tagNode?.toValue();
			if (typeof payload !== "string") {
				return;
			}
			const parsed = parseTagDefinition(payload);
			if (parsed) {
				map.set(parsed.tag.toUpperCase(), parsed.uri);
			}
		});

	return map;
};

const ensureSchemaNode = (gedcom: GedComType) => {
	const head = gedcom.get("HEAD");
	if (!head) {
		return undefined;
	}
	let schma = head.get("SCHMA");
	if (!schma) {
		schma = createCommon(gedcom, undefined, head);
		head.set("SCHMA", schma);
	}
	return schma;
};

/**
 * Register or update a documented extension tag in HEAD.SCHMA.
 */
export const registerExtensionTag = (
	gedcom: GedComType,
	tag: string,
	uri: string
) => {
	const normalizedTag = tag.trim().toUpperCase();
	const normalizedUri = uri.trim();
	if (!normalizedTag.startsWith("_") || !normalizedUri) {
		return undefined;
	}

	const schma = ensureSchemaNode(gedcom);
	if (!schma) {
		return undefined;
	}

	const payload = `${normalizedTag} ${normalizedUri}`;
	const existingList = schma.get("TAG")?.toList();
	const existing = existingList?.values().find((node) => {
		const value = node?.toValue();
		return (
			typeof value === "string" &&
			value.trim().toUpperCase().startsWith(`${normalizedTag} `)
		);
	});

	if (existing) {
		existing.value = payload;
		return existing;
	}

	const tagNode = createCommon(gedcom, undefined, schma);
	tagNode.value = payload;
	schma.assign("TAG", tagNode);
	return tagNode;
};

/**
 * Ensure TreeViz (and optionally discovered) underscore tags are documented
 * in HEAD.SCHMA for GEDCOM 7 export. Returns a restore callback.
 */
export const ensureExtensionSchema = (
	gedcom: GedComType,
	extraTags?: string[]
): (() => void) => {
	const head = gedcom.get("HEAD");
	const hadSchma = !!head?.get("SCHMA");
	const previousPayloads =
		head
			?.get("SCHMA")
			?.get("TAG")
			?.toList()
			?.values()
			.map((node) => ({
				node,
				value: node?.toValue(),
			})) ?? [];

	const tags = new Set<string>([
		...Object.keys(TREEVIZ_EXTENSION_URIS),
		...(extraTags ?? []).map((tag) => tag.toUpperCase()),
	]);

	tags.forEach((tag) => {
		const uri =
			TREEVIZ_EXTENSION_URIS[tag] ?? `https://treeviz.com/gedcom#${tag}`;
		if (tag.startsWith("_")) {
			registerExtensionTag(gedcom, tag, uri);
		}
	});

	return () => {
		if (!head) {
			return;
		}
		if (!hadSchma) {
			head.remove("SCHMA");
			return;
		}
		const schma = head.get("SCHMA");
		const list = schma?.get("TAG")?.toList();
		const keep = new Set(
			previousPayloads
				.map((item) =>
					typeof item.value === "string" ? item.value : undefined
				)
				.filter((value): value is string => !!value)
		);
		list?.values().forEach((node) => {
			const value = node?.toValue();
			if (typeof value === "string" && !keep.has(value) && node) {
				list.delete(node);
			}
		});
		previousPayloads.forEach(({ node, value }) => {
			if (node && value !== undefined) {
				node.value = value;
			}
		});
	};
};

/**
 * Collect underscore tags present under a node (shallow helper for export).
 */
export const collectExtensionTagsFrom = (
	node: Common | undefined,
	into: Set<string> = new Set()
) => {
	if (!node) {
		return into;
	}

	const keys = Object.keys(node as object).filter(
		(key) =>
			key.startsWith("_") &&
			!key.startsWith("_gedcom") &&
			!key.startsWith("_value") &&
			!key.startsWith("_id") &&
			!key.startsWith("_main") &&
			!key.startsWith("_parent") &&
			!key.startsWith("_unique") &&
			!key.startsWith("_type") &&
			!key.startsWith("_refs") &&
			!key.startsWith("_date")
	);

	keys.forEach((key) => {
		const tag = key.toUpperCase();
		if (/^_[A-Z0-9_]+$/.test(tag)) {
			into.add(tag);
		}
	});

	return into;
};
