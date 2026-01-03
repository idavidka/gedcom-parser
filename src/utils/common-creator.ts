import { createCommon } from "../classes/common";
import type { Common } from "../classes/common";
import { createCommonDate } from "../classes/date";
import { createFam } from "../classes/fam";
import { GedCom } from "../classes/gedcom";
import type { GedComType } from "../classes/gedcom";
import { createIndi, Indi } from "../classes/indi";
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
