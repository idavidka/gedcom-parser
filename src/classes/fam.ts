import type IFamilyStructure from "../interfaces/family";
import { type FamKey, type IndiKey } from "../types";
import type IFam from "../interfaces/fam";

import { Common, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { Families } from "./fams";
import { type GedComType } from "./gedcom";
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
