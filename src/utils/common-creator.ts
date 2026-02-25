import { Common, createCommon } from "../classes/common";
import type { RawObjectFactory } from "../classes/common";
import { createCommonDate } from "../classes/date";
import { createFam } from "../classes/fam";
import { GedCom } from "../classes/gedcom";
import type { GedComType } from "../classes/gedcom";
import { createIndi, Indi } from "../classes/indi";
import { List } from "../classes/list";
import { createCommonName } from "../classes/name";
import { createCommonNote } from "../classes/note";
import { createObje } from "../classes/obje";
import { createRepo } from "../classes/repo";
import { createSour } from "../classes/sour";
import { createSubm } from "../classes/subm";
import type {
	MultiTag,
	IdType,
	ConvertType,
	RepoKey,
	SubmKey,
	SourKey,
	ObjeKey,
	IndiKey,
	FamKey,
} from "../types/types";

/**
 * Creates a single Common instance from a raw plain object entry (from toObject output).
 * Handles id/value fields and recursively calls fromObject for nested entries.
 */
const createCommonFromRaw = (
	tag: MultiTag,
	raw: Record<string, unknown>,
	gedcom?: GedComType,
	main?: Common,
	parent?: Common
): Common => {
	const id = raw.id as IdType | undefined;
	const node = createTypedCommon(tag, id, gedcom, main, parent);
	node.fromObject(raw);
	return node;
};

/**
 * Instantiates the correct class for a given tag (with optional id).
 * Mirrors the logic in `create()` but without parser-level side effects.
 */
const createTypedCommon = (
	tag: MultiTag,
	id: IdType | undefined,
	gedcom: GedComType | undefined,
	main: Common | undefined,
	parent: Common | undefined
): Common => {
	const convertType = tag as ConvertType;
	let node: Common;

	if (!gedcom) {
		return createCommon(undefined, id, main, parent);
	}

	if (id) {
		if (convertType === "REPO") {
			node = createRepo(gedcom, id as RepoKey);
		} else if (convertType === "SUBM") {
			node = createSubm(gedcom, id as SubmKey);
		} else if (convertType === "SOUR") {
			node = createSour(gedcom, id as SourKey);
		} else if (convertType === "OBJE") {
			node = createObje(gedcom, id as ObjeKey);
		} else if (convertType === "INDI" || convertType === "_INDI") {
			node = createIndi(gedcom, id as IndiKey);
		} else if (convertType === "FAM") {
			node = createFam(gedcom, id as FamKey);
		} else {
			node = createCommon(gedcom, id);
		}
	} else {
		if (tag === "REPO") {
			node = createRepo(gedcom, undefined, main, parent);
		} else if (tag === "SUBM") {
			node = createSubm(gedcom, undefined, main, parent);
		} else if (tag === "SOUR") {
			node = createSour(gedcom, undefined, main, parent);
		} else if (tag === "OBJE") {
			node = createObje(gedcom, undefined, main, parent);
		} else if (tag === "DATE") {
			node = createCommonDate(gedcom, undefined, main, parent);
		} else if (tag === "NOTE") {
			node = createCommonNote(gedcom, undefined, main, parent);
		} else if (tag === "NAME" && main instanceof Indi) {
			node = createCommonName(gedcom, undefined, main, parent);
		} else {
			node = createCommon(gedcom, undefined, main, parent);
		}
	}

	node.type = tag;
	return node;
};

/**
 * The injectable factory registered on Common._objectFactory.
 * Converts a raw plain-object value (from toObject) back into a Common or List instance.
 *
 * - Array of objects → List of Common instances
 * - Single object    → one Common instance
 * - Primitive        → a bare Common with just .value set
 */
const rawObjectFactory: RawObjectFactory = (
	tag,
	rawValue,
	gedcom,
	main,
	parent
): Common | List | undefined => {
	if (rawValue === undefined || rawValue === null) {
		return undefined;
	}

	// Array → List (multiple siblings with the same tag)
	if (Array.isArray(rawValue)) {
		const list = new List();
		rawValue.forEach((item, index) => {
			const child = rawObjectFactory(tag, item, gedcom, main, parent);
			if (child instanceof Common) {
				const key = (child.id ?? `${index}`) as IdType;
				list.item(key, child);
			}
		});
		return list;
	}

	// Plain object → recurse into it as a Common
	if (typeof rawValue === "object") {
		const raw = rawValue as Record<string, unknown>;
		return createCommonFromRaw(tag, raw, gedcom, main, parent);
	}

	// Primitive (string / number / boolean) → bare Common with value
	const node = createTypedCommon(tag, undefined, gedcom, main, parent);
	node.value = String(rawValue);
	return node;
};

// Register the factory once so Common can use it without importing this module
Common._objectFactory = rawObjectFactory;

export const create = (
	gedcom: GedComType,
	type: MultiTag,
	id?: string,
	nodes?: {
		mainNode?: Common;
		curNode?: Common;
		prevNode?: Common;
	}
) => {
	let mainNode = nodes?.mainNode;
	const curNode = nodes?.curNode;
	let prevNode = nodes?.prevNode;
	if (id) {
		const convertType = type as ConvertType;
		if (convertType === "REPO") {
			prevNode = createRepo(gedcom, id as RepoKey);
		} else if (convertType === "SUBM") {
			prevNode = createSubm(gedcom, id as SubmKey);
		} else if (convertType === "SOUR") {
			prevNode = createSour(gedcom, id as SourKey);
		} else if (convertType === "OBJE" && curNode instanceof GedCom) {
			prevNode = createObje(gedcom, id as ObjeKey);
		} else if (convertType === "INDI") {
			prevNode = createIndi(gedcom, id as IndiKey);
		} else if (convertType === "_INDI") {
			prevNode = createIndi(gedcom, id as IndiKey);
		} else if (convertType === "FAM") {
			prevNode = createFam(gedcom, id as FamKey);
		} else {
			prevNode = createCommon(gedcom, id as IdType);
		}
		mainNode = prevNode;
	} else {
		if (type === "REPO") {
			prevNode = createRepo(gedcom, undefined, mainNode, curNode);
		} else if (type === "SUBM") {
			prevNode = createSubm(gedcom, undefined, mainNode, curNode);
		} else if (type === "SOUR") {
			prevNode = createSour(gedcom, undefined, mainNode, curNode);
		} else if (type === "OBJE") {
			prevNode = createObje(gedcom, undefined, mainNode, curNode);
		} else if (type === "DATE") {
			prevNode = createCommonDate(gedcom, undefined, mainNode, curNode);
		} else if (type === "NOTE") {
			prevNode = createCommonNote(gedcom, undefined, mainNode, curNode);
		} else if (type === "NAME" && mainNode instanceof Indi) {
			prevNode = createCommonName(gedcom, undefined, mainNode, curNode);
		} else {
			prevNode = createCommon(gedcom, undefined, mainNode, curNode);
		}
	}

	prevNode.type = type;

	return { prevNode, curNode, mainNode };
};
