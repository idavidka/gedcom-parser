import type { Common } from "../classes/common";
import type { FamType } from "../classes/fam";
import type { Families } from "../classes/fams";
import type { IndiType } from "../classes/indi";
import type { Individuals } from "../classes/indis";
import type { List } from "../classes/list";
import type { ObjeType } from "../classes/obje";
import type { CommonNote } from "../classes/note";
import type { IndiKey, ObjeKey, RelationType, SnoteKey } from "../types/types";
import type {
	AttachMultimediaOptions,
	CreateMultimediaInput,
} from "../utils/multimedia";
import type { AddFactInput, AddNonEventInput } from "../utils/fact-edit";

export type GeneratorKey = `${"2nd" | "3rd" | `${4 | 5 | 6 | 7 | 8 | 9}th`}`;
export type GeneratorType =
	| "Cousins"
	| "GreatGrandParents"
	| "GreatGrandChildren";

export type GeneratedIndiMethods = Record<
	`get${GeneratorKey}${GeneratorType}`,
	() => Individuals
>;

export type MediaList = Record<
	string,
	{
		isPrimary?: boolean;
		key: string;
		id: string;
		imgId: string;
		tree: string;
		person: IndiKey;
		title: string;
		url: string;
		contentType: string;
		downloadName: string;
	}
>;

interface IIndi extends Common<string, IndiKey> {
	getBirthDate: (
		showDays?: boolean,
		shortNote?: boolean,
		showNote?: boolean
	) => string | undefined;

	getDeathDate: (
		showDays?: boolean,
		shortNote?: boolean,
		showNote?: boolean
	) => string | undefined;

	getBirthPlace: () => string | undefined;

	getDeathPlace: () => string | undefined;

	isParentOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isChildOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isSiblingOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isSpouseOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isParentInLawOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isChildInLawOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isSiblingInLawOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	toFamilies: (list?: List) => Families;

	addSpouse: (other: IndiType) => FamType | undefined;

	addChild: (
		child: IndiType,
		pedigree?: string | RelationType
	) => FamType | undefined;

	addParent: (
		parent: IndiType,
		pedigree?: string | RelationType
	) => FamType | undefined;

	attachMultimedia: (
		objeOrKey: ObjeType | ObjeKey,
		options?: AttachMultimediaOptions
	) => ObjeType | undefined;

	detachMultimedia: (objeKey: ObjeKey) => void;

	attachMediaFromUrl: (
		url: string,
		options?: CreateMultimediaInput & AttachMultimediaOptions
	) => ObjeType | undefined;

	attachSharedNote: (
		noteOrKey: CommonNote | SnoteKey
	) => CommonNote | undefined;

	addFact: (input: AddFactInput) => Common | undefined;

	addNonEvent: (input: AddNonEventInput) => Common | undefined;

	getAscendants: () => Individuals;

	getDescendants: () => Individuals;

	getRelativesOnLevel: () => Individuals;

	getRelativesOnDegree: () => Individuals;

	getAllDescendants: () => Individuals;

	getAllAscendants: () => Individuals;

	getSiblings: () => Individuals;

	getBrothers: () => Individuals;

	getSisters: () => Individuals;

	getChildren: () => Individuals;

	getAdoptedChildren: () => Individuals;

	getBirthChildren: () => Individuals;

	getFosterChildren: () => Individuals;

	getSealingChildren: () => Individuals;

	getStepChildren: () => Individuals;

	getSons: () => Individuals;

	getAdoptedSons: () => Individuals;

	getBirthSons: () => Individuals;

	getFosterSons: () => Individuals;

	getSealingSons: () => Individuals;

	getStepSons: () => Individuals;

	getDaughters: () => Individuals;

	getAdoptedDaughters: () => Individuals;

	getBirthDaughters: () => Individuals;

	getFosterDaughters: () => Individuals;

	getSealingDaughters: () => Individuals;

	getStepDaughters: () => Individuals;

	getParents: () => Individuals;

	getAdoptedParents: () => Individuals;

	getBirthParents: () => Individuals;

	getFosterParents: () => Individuals;

	getSealingParents: () => Individuals;

	getStepParents: () => Individuals;

	getFathers: () => Individuals;

	getAdoptedFathers: () => Individuals;

	getBirthFathers: () => Individuals;

	getFosterFathers: () => Individuals;

	getSealingFathers: () => Individuals;

	getStepFathers: () => Individuals;

	getMothers: () => Individuals;

	getAdoptedMothers: () => Individuals;

	getBirthMothers: () => Individuals;

	getFosterMothers: () => Individuals;

	getSealingMothers: () => Individuals;

	getStepMothers: () => Individuals;

	getSpouses: () => Individuals;

	getCoParents: () => Individuals;

	getWives: () => Individuals;

	getHusbands: () => Individuals;

	getCousins: () => Individuals;

	getGrandParents: () => Individuals;

	getGrandFathers: () => Individuals;

	getGrandMothers: () => Individuals;

	getGrandChildren: () => Individuals;

	getGrandSons: () => Individuals;

	getGrandDaughters: () => Individuals;

	getGreatGrandParents: () => Individuals;

	getGreatGrandFathers: () => Individuals;

	getGreatGrandMothers: () => Individuals;

	getGreatGrandChildren: () => Individuals;

	getGreatGrandSons: () => Individuals;

	getGreatGrandDaughters: () => Individuals;

	getNiblings: () => Individuals;

	getNieces: () => Individuals;

	getNephews: () => Individuals;

	getAuncles: () => Individuals;

	getAunts: () => Individuals;

	getUncles: () => Individuals;

	getParentsInLaw: () => Individuals;

	getFathersInLaw: () => Individuals;

	getMothersInLaw: () => Individuals;

	getChildrenInLaw: () => Individuals;

	getSonsInLaw: () => Individuals;

	getDaughtersInLaw: () => Individuals;

	getSiblingsInLaw: () => Individuals;

	getBrothersInLaw: () => Individuals;

	getSistersInLaw: () => Individuals;
}

export default IIndi;
