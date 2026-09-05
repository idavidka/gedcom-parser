import type { Common } from "../classes/common";
import type { IndiType } from "../classes/indi";
import type { Individuals } from "../classes/indis";
import type { FamKey, IndiKey, RelationType } from "../types/types";
import type { AddFactInput, AddNonEventInput } from "../utils/fact-edit";

interface IFam extends Common<string, FamKey> {
	_IS_ORPHAN_FAMILY?: Common<"Y" | "N">;

	getChildren: () => Individuals;

	getHusband: () => Individuals;

	getWife: () => Individuals;

	hasParent: (indi?: IndiKey | IndiType) => boolean;

	hasChild: (indi?: IndiKey | IndiType) => boolean;

	canAddSpouse: (indi: IndiType) => boolean;

	addSpouse: (indi: IndiType) => boolean;

	addChild: (
		child: IndiType,
		pedigree?: string | RelationType,
		parent?: IndiType
	) => boolean;

	addFact: (input: AddFactInput) => Common | undefined;

	addNonEvent: (input: AddNonEventInput) => Common | undefined;
}

export default IFam;
