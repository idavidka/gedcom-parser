import type IFam from "../interfaces/fam";
import type IFamilyStructure from "../structures/family";
import type { FamKey, IndiKey, RelationType } from "../types/types";
import {
	attachChildToFamily,
	attachSpouseToFamily,
	canAttachAsSpouse,
	familyHasChild,
	familyHasParent,
} from "../utils/family-edit";
import { addFamilyFact, addNonEvent } from "../utils/fact-edit";
import type { AddFactInput, AddNonEventInput } from "../utils/fact-edit";

import { Common, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { Families } from "./fams";
import type { GedComType } from "./gedcom";
import type { IndiType } from "./indi";
import { Individuals } from "./indis";

export class Fam extends Common<string, FamKey> implements IFam {
	private getFamilyMembers(type: "CHIL" | "WIFE" | "HUSB"): Individuals {
		const familyMembers = new Individuals();
		this.get(type)
			?.toList()
			.forEach((item) => {
				const indiId = item.value as IndiKey;
				const indi = this._gedcom?.indi(indiId);

				if (indi) {
					familyMembers.item(indiId, indi);
				}
			});
		return familyMembers;
	}

	getChildren() {
		return this.getFamilyMembers("CHIL");
	}

	getHusband() {
		return this.getFamilyMembers("HUSB");
	}

	getWife() {
		return this.getFamilyMembers("WIFE");
	}

	getParents(): Individuals {
		return this.getHusband().copy().merge(this.getWife());
	}

	hasParent(indi?: IndiKey | IndiType) {
		const indiId = typeof indi === "string" ? indi : indi?.id;
		return !!indiId && familyHasParent(this as unknown as FamType, indiId);
	}

	hasChild(indi?: IndiKey | IndiType) {
		const indiId = typeof indi === "string" ? indi : indi?.id;
		return !!indiId && familyHasChild(this as unknown as FamType, indiId);
	}

	canAddSpouse(indi: IndiType) {
		return canAttachAsSpouse(this as unknown as FamType, indi);
	}

	addSpouse(indi: IndiType) {
		return attachSpouseToFamily(this as unknown as FamType, indi);
	}

	addChild(
		child: IndiType,
		pedigree?: string | RelationType,
		parent?: IndiType
	) {
		return attachChildToFamily(
			this as unknown as FamType,
			child,
			pedigree,
			parent
		);
	}

	addFact(input: AddFactInput) {
		return addFamilyFact(this as unknown as FamType, input);
	}

	addNonEvent(input: AddNonEventInput) {
		return addNonEvent(this as unknown as FamType, input);
	}

	toList() {
		return new Families().concat(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.id ? { [this.id]: this } : ({ ...[this] } as any)
		);
	}
}

export type FamType = Fam & IFamilyStructure;
export const createFam = (
	gedcom: GedComType,
	id: FamKey,
	main?: Common,
	parent?: Common
): ProxyOriginal<FamType> => {
	return createProxy(
		new Fam(gedcom, id, main, parent)
	) as ProxyOriginal<FamType>;
};
