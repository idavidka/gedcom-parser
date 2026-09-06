import { createCommon } from "../classes/common";
import type { Common } from "../classes/common";
import type { FamType } from "../classes/fam";
import type { GedComType } from "../classes/gedcom";
import type { IndiType } from "../classes/indi";
import { List } from "../classes/list";
import { RelationType } from "../types/types";
import type { FamKey, IndiKey, MultiTag } from "../types/types";

import { resetRelativesCache } from "./cache";

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
	refType: "INDI" | "FAM" | "OBJE" | "SNOTE" | "NOTE"
) => {
	const pointer = createCommon(gedcom, undefined, parent);
	pointer.value = value;
	pointer.refType = refType;
	return pointer;
};

export const nextRecordId = (
	ids: Array<string | undefined>,
	prefix: "I" | "F" | "O" | "N"
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
	resetRelativesCache();
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
	resetRelativesCache();
	return true;
};

/**
 * Remove a pointer (`FAMC` / `FAMS` / `CHIL` / …) whose value equals `targetId`.
 */
export const removePointerByValue = (
	owner: Common,
	tag: MultiTag,
	targetId: string
): boolean => {
	const node = owner.get(tag);
	if (!node) {
		return false;
	}

	if (node instanceof List) {
		const keysToRemove: Array<string | number> = [];
		node.entries().forEach(([key, item]) => {
			if (
				item?.toValue?.() === targetId ||
				item?.id === targetId ||
				String(key) === targetId
			) {
				keysToRemove.push(key as string | number);
			}
		});
		keysToRemove.forEach((key) => {
			node.removeItem(key as never);
		});
		if (node.length === 0) {
			owner.remove(tag);
		}
		return keysToRemove.length > 0;
	}

	if (node.toValue?.() === targetId) {
		owner.remove(tag);
		return true;
	}

	const asList = node.toList?.();
	if (asList && asList.length > 0) {
		const keysToRemove: Array<string | number> = [];
		asList.entries().forEach(([key, item]) => {
			if (item?.toValue?.() === targetId || item?.id === targetId) {
				keysToRemove.push(key as string | number);
			}
		});
		if (keysToRemove.length === asList.length) {
			owner.remove(tag);
			return true;
		}
		if (keysToRemove.length > 0) {
			// Promote remaining entries into a List on the owner
			const remaining = asList
				.values()
				.filter((item) => item?.toValue?.() !== targetId);
			if (remaining.length === 1 && remaining[0]) {
				owner.set(tag, remaining[0]);
			} else {
				owner.set(tag, new List(remaining as Common[]));
			}
			return true;
		}
	}

	return false;
};

const familyMemberCount = (fam: FamType) => {
	let count = 0;
	if (firstPointerId(fam.get("HUSB"))) {
		count += 1;
	}
	if (firstPointerId(fam.get("WIFE"))) {
		count += 1;
	}
	count += pointerIds(fam.get("CHIL")).length;
	return count;
};

/** Drop families with no husband, wife, or children; clear dangling FAMS/FAMC. */
export const pruneEmptyFamilies = (gedcom: GedComType) => {
	const emptyIds: FamKey[] = [];
	gedcom.fams()?.forEach((fam, id) => {
		if (fam && familyMemberCount(fam) === 0 && id) {
			emptyIds.push(id);
		}
	});

	if (emptyIds.length === 0) {
		return;
	}

	gedcom.indis()?.forEach((indi) => {
		if (!indi) {
			return;
		}
		emptyIds.forEach((famId) => {
			removePointerByValue(indi, "FAMS", famId);
			removePointerByValue(indi, "FAMC", famId);
		});
	});

	emptyIds.forEach((famId) => {
		gedcom.fams()?.removeItem(famId);
	});
};

export type UnlinkRelativeKind = "parent" | "spouse" | "child" | "sibling";

/**
 * Unlink `relative` from `anchor` for the given role. Does not delete either
 * INDI record — only family pointers. Creates no new families.
 */
export const unlinkRelative = (
	anchor: IndiType,
	relative: IndiType,
	kind: UnlinkRelativeKind
): boolean => {
	if (!anchor.id || !relative.id || anchor.id === relative.id) {
		return false;
	}

	let changed = false;

	if (kind === "spouse") {
		anchor.getFamilies("FAMS")?.forEach((fam) => {
			if (!fam?.id || !familyHasParent(fam, relative.id as IndiKey)) {
				return;
			}
			if (firstPointerId(fam.get("HUSB")) === relative.id) {
				fam.remove("HUSB");
				changed = true;
			}
			if (firstPointerId(fam.get("WIFE")) === relative.id) {
				fam.remove("WIFE");
				changed = true;
			}
			changed =
				removePointerByValue(relative, "FAMS", fam.id) || changed;
		});
	} else if (kind === "parent") {
		// `relative` is a parent of `anchor` — remove parent from HUSB/WIFE +
		// FAMS; keep the child's CHIL/FAMC unless the family is later pruned.
		anchor.getFamilies("FAMC")?.forEach((fam) => {
			if (!fam?.id || !familyHasParent(fam, relative.id as IndiKey)) {
				return;
			}
			if (firstPointerId(fam.get("HUSB")) === relative.id) {
				fam.remove("HUSB");
				changed = true;
			}
			if (firstPointerId(fam.get("WIFE")) === relative.id) {
				fam.remove("WIFE");
				changed = true;
			}
			changed =
				removePointerByValue(relative, "FAMS", fam.id) || changed;
		});
	} else if (kind === "sibling") {
		// Remove `relative` from a shared childhood family of `anchor`.
		anchor.getFamilies("FAMC")?.forEach((fam) => {
			if (!fam?.id || !familyHasChild(fam, relative.id as IndiKey)) {
				return;
			}
			changed =
				removePointerByValue(fam, "CHIL", relative.id as string) ||
				changed;
			changed =
				removePointerByValue(relative, "FAMC", fam.id) || changed;
		});
	} else {
		// `relative` is a child of `anchor`
		anchor.getFamilies("FAMS")?.forEach((fam) => {
			if (!fam?.id || !familyHasChild(fam, relative.id as IndiKey)) {
				return;
			}
			changed =
				removePointerByValue(fam, "CHIL", relative.id as string) ||
				changed;
			changed =
				removePointerByValue(relative, "FAMC", fam.id) || changed;
		});
	}

	if (changed) {
		const gedcom = anchor.getGedcom() ?? relative.getGedcom();
		if (gedcom) {
			pruneEmptyFamilies(gedcom);
		}
		resetRelativesCache();
	}

	return changed;
};

/**
 * Permanently remove an individual from the GEDCOM and clean family links.
 */
export const deleteIndividual = (
	gedcom: GedComType,
	indiId: IndiKey
): boolean => {
	const indi = gedcom.indi(indiId);
	if (!indi?.id) {
		return false;
	}

	const famsIds = pointerIds(indi.get("FAMS"));
	const famcIds = pointerIds(indi.get("FAMC"));

	famsIds.forEach((famId) => {
		const fam = gedcom.fam(famId as FamKey);
		if (!fam) {
			return;
		}
		if (firstPointerId(fam.get("HUSB")) === indiId) {
			fam.remove("HUSB");
		}
		if (firstPointerId(fam.get("WIFE")) === indiId) {
			fam.remove("WIFE");
		}
	});

	famcIds.forEach((famId) => {
		const fam = gedcom.fam(famId as FamKey);
		if (fam) {
			removePointerByValue(fam, "CHIL", indiId);
		}
	});

	// Safety: remove CHIL refs from any family that still lists this person
	gedcom.fams()?.forEach((fam) => {
		if (fam && familyHasChild(fam, indiId)) {
			removePointerByValue(fam, "CHIL", indiId);
		}
		if (fam && familyHasParent(fam, indiId)) {
			if (firstPointerId(fam.get("HUSB")) === indiId) {
				fam.remove("HUSB");
			}
			if (firstPointerId(fam.get("WIFE")) === indiId) {
				fam.remove("WIFE");
			}
		}
	});

	gedcom.indis()?.removeItem(indiId);
	pruneEmptyFamilies(gedcom);
	resetRelativesCache();
	return true;
};

export type FindReusableParentChildFamilyOptions = {
	/**
	 * When true (default), a parent with exactly one FAMS may receive the
	 * child there (normal "add child to my marriage").
	 * When false (add-parent flows), only the child's existing FAMC families
	 * are considered — never an unrelated spouse family of the new parent
	 * unless `targetFamilyId` is set.
	 */
	reuseParentFamilies?: boolean;
	/**
	 * Explicit FAM to use (e.g. user picked a spouse family of the new
	 * parent). Takes priority after "already linked" / fillable FAMC checks.
	 */
	targetFamilyId?: FamKey;
};

/**
 * Prefer an existing family for a parent↔child link.
 * - Always reuse a child's FAMC if the parent is already there, or can join
 *   as the missing spouse.
 * - If `targetFamilyId` is set, use that FAM when the parent can attach.
 * - Optionally reuse the parent's sole FAMS (add-child). Skip that for
 *   add-parent so an extra parent gets a new family when they are not already
 *   in the child's family.
 */
export const findReusableParentChildFamily = (
	parent: IndiType,
	child: IndiType,
	options?: FindReusableParentChildFamilyOptions
): FamType | "already" | undefined => {
	if (!parent.id || !child.id) {
		return undefined;
	}

	const reuseParentFamilies = options?.reuseParentFamilies !== false;
	const gedcom = parent.getGedcom() ?? child.getGedcom();

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

	if (options?.targetFamilyId && gedcom) {
		const target = gedcom.fam(options.targetFamilyId);
		if (
			target &&
			(familyHasParent(target, parent.id as IndiKey) ||
				canAttachAsSpouse(target, parent))
		) {
			return target;
		}
	}

	if (!reuseParentFamilies) {
		return undefined;
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
