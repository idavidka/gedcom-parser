import { createCommon } from "../classes/common";
import type { Common } from "../classes/common";
import type { FamType } from "../classes/fam";
import type { GedComType } from "../classes/gedcom";
import type { IndiType } from "../classes/indi";
import { List } from "../classes/list";
import { RelationType } from "../types/types";
import type { FamKey, IndiKey, MultiTag } from "../types/types";

export const PEDIGREE_VALUES = [
	RelationType.BIRTH,
	RelationType.ADOPTED,
	RelationType.FOSTER,
	RelationType.STEP,
	RelationType.SEALING,
] as const;

export type PedigreeValue = (typeof PEDIGREE_VALUES)[number];

export const toGedcomPedigree = (
	value?: string | RelationType
): PedigreeValue => {
	const normalized = String(value || RelationType.BIRTH).toLowerCase();
	if (normalized === RelationType.BIOLOGICAL || normalized === RelationType.BIRTH) {
		return RelationType.BIRTH;
	}

	const match = PEDIGREE_VALUES.find((item) => item === normalized);
	return match ?? RelationType.BIRTH;
};

export const pointerIds = (tag?: Common | List): string[] => {
	if (!tag) {
		return [];
	}

	if (tag instanceof List) {
		return tag
			.values()
			.map((item) => item?.toValue?.())
			.filter((value): value is string => !!value);
	}

	const value = tag.toValue?.();
	return value ? [String(value)] : [];
};

export const firstPointerId = (tag?: Common | List) => pointerIds(tag)[0];

export const makePointer = (
	gedcom: GedComType,
	parent: Common,
	value: string,
	refType: "INDI" | "FAM"
) => {
	const pointer = createCommon(gedcom, undefined, parent);
	pointer.value = value;
	pointer.refType = refType;
	return pointer;
};

export const nextRecordId = (
	ids: Array<string | undefined>,
	prefix: "I" | "F"
) => {
	let max = 0;
	ids.forEach((id) => {
		const match = String(id).match(/(\d+)/);
		const n = match ? Number.parseInt(match[1], 10) : 0;
		if (n > max) {
			max = n;
		}
	});

	return `@${prefix}${max + 1}@`;
};

export const familyHasParent = (fam: FamType, indiId: IndiKey) =>
	pointerIds(fam.get("HUSB")).includes(indiId) ||
	pointerIds(fam.get("WIFE")).includes(indiId);

export const familyHasChild = (fam: FamType, indiId: IndiKey) =>
	pointerIds(fam.get("CHIL")).includes(indiId);

export const spouseTagFor = (indi: IndiType, fam: FamType): "HUSB" | "WIFE" => {
	const husbId = firstPointerId(fam.get("HUSB"));
	const wifeId = firstPointerId(fam.get("WIFE"));

	if (husbId === indi.id) {
		return "HUSB";
	}
	if (wifeId === indi.id) {
		return "WIFE";
	}

	if (indi.isFemale()) {
		return wifeId && wifeId !== indi.id ? "HUSB" : "WIFE";
	}

	if (indi.isMale()) {
		return husbId && husbId !== indi.id ? "WIFE" : "HUSB";
	}

	return husbId ? "WIFE" : "HUSB";
};

export const canAttachAsSpouse = (fam: FamType, indi: IndiType) => {
	if (!indi.id) {
		return false;
	}

	if (familyHasParent(fam, indi.id)) {
		return true;
	}

	const tag = spouseTagFor(indi, fam);
	const occupied = firstPointerId(fam.get(tag));
	return !occupied || occupied === indi.id;
};

const pointerByValue = (tag: Common | List | undefined, id: string) => {
	if (!tag) {
		return undefined;
	}

	const fromValues = tag.toValueList?.().item(id as IndiKey | FamKey);
	if (fromValues) {
		return fromValues;
	}

	return tag
		.toList()
		?.values()
		.find((item) => item?.toValue?.() === id);
};

export const setChildPedigree = (
	fam: FamType,
	child: IndiType,
	pedigree?: string | RelationType,
	parent?: IndiType
) => {
	if (!fam.id || !child.id) {
		return;
	}

	const pedi = toGedcomPedigree(pedigree);
	const famc = pointerByValue(child.get("FAMC"), fam.id);
	if (famc) {
		famc.set("PEDI" as MultiTag, pedi);
	}

	const chil = pointerByValue(fam.get("CHIL"), child.id);
	if (!chil) {
		return;
	}

	const setFather = !parent || parent.isMale() || parent.isUnknownSex();
	const setMother = !parent || parent.isFemale() || parent.isUnknownSex();
	if (setFather) {
		chil.set("_FREL" as MultiTag, pedi);
	}
	if (setMother) {
		chil.set("_MREL" as MultiTag, pedi);
	}
};

export const attachSpouseToFamily = (fam: FamType, indi: IndiType) => {
	const gedcom = fam.getGedcom() ?? indi.getGedcom();
	if (!indi.id || !fam.id || !gedcom) {
		return false;
	}

	if (!canAttachAsSpouse(fam, indi)) {
		return false;
	}

	const tag = spouseTagFor(indi, fam);
	if (firstPointerId(fam.get(tag)) !== indi.id) {
		fam.set(tag, makePointer(gedcom, fam, indi.id, "INDI"));
	}

	indi.assign("FAMS", makePointer(gedcom, indi, fam.id, "FAM"), true);
	return true;
};

export const attachChildToFamily = (
	fam: FamType,
	child: IndiType,
	pedigree?: string | RelationType,
	parent?: IndiType
) => {
	const gedcom = fam.getGedcom() ?? child.getGedcom();
	if (!child.id || !fam.id || !gedcom) {
		return false;
	}

	if (!familyHasChild(fam, child.id)) {
		fam.assign("CHIL", makePointer(gedcom, fam, child.id, "INDI"), true);
	}

	const existingFamc = pointerByValue(child.get("FAMC"), fam.id);
	if (!existingFamc) {
		child.assign("FAMC", makePointer(gedcom, child, fam.id, "FAM"), true);
	}

	setChildPedigree(fam, child, pedigree, parent);
	return true;
};

export const findReusableParentChildFamily = (
	parent: IndiType,
	child: IndiType
): FamType | "already" | undefined => {
	if (!parent.id || !child.id) {
		return undefined;
	}

	let reusableFamc: FamType | undefined;
	let already = false;

	child.getFamilies("FAMC")?.forEach((fam) => {
		if (!fam) {
			return;
		}

		if (
			familyHasParent(fam, parent.id as IndiKey) &&
			familyHasChild(fam, child.id as IndiKey)
		) {
			already = true;
			return;
		}

		if (!reusableFamc && canAttachAsSpouse(fam, parent)) {
			reusableFamc = fam;
		}
	});

	if (already) {
		return "already";
	}

	if (reusableFamc) {
		return reusableFamc;
	}

	const parentFams: FamType[] = [];
	parent.getFamilies("FAMS")?.forEach((fam) => {
		if (fam) {
			parentFams.push(fam);
		}
	});

	if (parentFams.length === 1) {
		return parentFams[0];
	}

	return undefined;
};
