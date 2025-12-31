/**
 * GEDCOM Parser Types
 * Core type definitions for GEDCOM parsing and manipulation
 */

import { type Common } from "./classes/common";
import { type Individuals } from "./classes/indis";

// ID types for different GEDCOM record types
export type IndiKey = `@${"I" | "P" | "XI" | "XXI"}${number}@`;
export type FamKey = `@${"F" | "XF" | "XXF"}${number}@`;
export type ObjeKey = `@O${number}@`;
export type RepoKey = `@R${number}@`;
export type SourKey = `@S${number}@`;
export type SubmKey = `@SUBM${number}@`;
export type TagKey = `@T${number}@`;
export type UnknownKey = `@U${number}@`;

export type IdType =
	| IndiKey
	| FamKey
	| ObjeKey
	| SourKey
	| RepoKey
	| SubmKey
	| UnknownKey;

export type ConvertType =
	| "FAM"
	| "INDI"
	| "_INDI"
	| "OBJE"
	| "SOUR"
	| "REPO"
	| "SUBM";

// Relationship types
export enum RelationType {
	BIOLOGICAL = "biological",
	ADOPTED = "adopted",
	FOSTER = "foster",
	SEALING = "sealing",
	BIRTH = "birth",
	STEP = "step",
}

// Partner types
export enum PartnerType {
	SPOUSE = "spouse",
	PARTNER = "partner",
	FRIEND = "friend",
	SINGLE = "single",
	OTHER = "other",
	UNKOWN = "unknown",
}

// Non-standard tags
export interface NonStandard {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	id?: any;
}

// Standard and custom GEDCOM tags
interface Tags {
	_PRIM?: Common<"Y" | "N">;
	_EXPORTED_FROM_SITE_ID?: Common;
	_CLON?: Common;
	_MSER?: Common;
	_OID?: Common;
	_LKID?: Common;
	_PHOTO_RIN?: Common;
	_MTTAG?: Common & { NAME?: Common };
	_MTCAT?: Common & { NAME?: Common };
	_SREL?: Common;
	_FREL?: Common;
	_MREL?: Common;
	_MILT?: Common;
	_MILTID?: Common;
	_ORIG?: Common;
	_LABEL?: Common;
	_WLNK?: Common;
	_MARNM?: Common;
	_INDI?: Common;
	_GUESSEDORIGINAL?: Common;
	_FS_LINK?: Common;
	_FS_ID?: Common;
	_IS_ORPHAN_FAMILY?: Common<"Y" | "N">;
	DISPLAYTEXT?: Common;
	FAM?: Common;
	INDIVIDUALINTERNALHYPERLINK?: Common;
	OBJE?: Common;
	FAMS?: Common;
	FAMC?: Common;
	ABBR?: Common;
	ADDR?: Common;
	ADR1?: Common;
	ADR2?: Common;
	ADOP?: Common;
	AFN?: Common;
	AGE?: Common;
	ALIA?: Common;
	AKA?: Common;
	ANUL?: Common;
	ARVL?: Common;
	AUTH?: Common;
	BAPL?: Common;
	BAPM?: Common;
	BARM?: Common;
	BASM?: Common;
	BIRT?: Common;
	BLES?: Common;
	BURI?: Common;
	CAST?: Common;
	CAUS?: Common;
	CENS?: Common;
	CHAN?: Common;
	CHAR?: Common;
	CHIL?: Common;
	CHR?: Common;
	CHRA?: Common;
	CITY?: Common;
	CONF?: Common;
	CONL?: Common;
	CONT?: Common;
	COPR?: Common;
	CORP?: Common;
	CREM?: Common;
	CTRY?: Common;
	DATE?: Common;
	DEAT?: Common;
	DESC?: Common;
	DESI?: Common;
	DEST?: Common;
	DIV?: Common;
	DIVF?: Common;
	DSCR?: Common;
	EDUC?: Common;
	EMAIL?: Common;
	EMIG?: Common;
	ENDL?: Common;
	ENGA?: Common;
	EVEN?: Common;
	FAX?: Common;
	FCOM?: Common;
	FILE?: Common;
	FORM?: Common;
	GEDC?: Common;
	GIVN?: Common;
	GRAD?: Common;
	HEAD?: Common;
	HUSB?: Common;
	IDNO?: Common;
	IMMI?: Common;
	INDI?: Common;
	LANG?: Common;
	LATI?: Common;
	LONG?: Common;
	MAP?: Common;
	MARB?: Common;
	MARC?: Common;
	MARL?: Common;
	MARR?: Common;
	MARS?: Common;
	MEDI?: Common;
	NAME?: Common;
	NATI?: Common;
	NATU?: Common;
	NCHI?: Common;
	NICK?: Common;
	NMR?: Common;
	NOTE?: Common;
	NPFX?: Common;
	NSFX?: Common;
	OCCU?: Common;
	ORDI?: Common;
	ORDN?: Common;
	PAGE?: Common;
	PART?: Common;
	PEDI?: Common;
	PHON?: Common;
	PLAC?: Common;
	POST?: Common;
	PROB?: Common;
	PROP?: Common;
	PUBL?: Common;
	QUAY?: Common;
	REFN?: Common;
	RELA?: Common;
	RELI?: Common;
	REPO?: Common;
	RESI?: Common;
	RESN?: Common;
	RETI?: Common;
	RFN?: Common;
	RIN?: Common;
	ROLE?: Common;
	SEX?: Common;
	SLGC?: Common;
	SLGS?: Common;
	SOUR?: Common;
	SPFX?: Common;
	SSN?: Common;
	STAE?: Common;
	STAT?: Common;
	SUBM?: Common;
	SUBN?: Common;
	SURN?: Common;
	TEMP?: Common;
	TEXT?: Common;
	TIME?: Common;
	TITL?: Common;
	TRLR?: Common;
	TYPE?: Common;
	VERS?: Common;
	WIFE?: Common;
	WILL?: Common;
	WWW?: Common;
	_DATE?: Common;
	_PLACE?: Common;
	_TYPE?: Common;
	_DESCRIPTION?: Common;
	_ATTRIBUTE_DESCRIPTOR?: Common;
	_EVENT_DESCRIPTOR?: Common;
}

export type Tag = keyof Tags | keyof NonStandard;
export type ListTag = `@@${keyof Tags}`;
export type MultiTag = ListTag | Tag | `${Tag}.${Tag}`;

// Parser settings
export interface ParseSettings {
	linkedPersons?: "merge" | "clone" | "skip";
	linkingKey?: MultiTag;
}

// Filter types
export type FilterIterator<T, K> = (
	item: T,
	key: K,
	index: number,
	list: T[]
) => boolean;

export type Filter<T = unknown> = Partial<Record<MultiTag, T>>;

export type RequiredFilter<T extends Tag, F = unknown> = Required<
	Pick<Record<MultiTag, F>, T>
> &
	Filter<F>;

// Order types
export interface OrderDefinition {
	reversed?: boolean;
	weight?: number;
	direction?: "asc" | "desc";
	getter?: (item: any) => any;
}

export type Order = MultiTag | Partial<Record<MultiTag, OrderDefinition>>;

export type OrderIterator<T, K> = (
	a: T,
	b: T,
	aKey: K,
	bKey: K,
	aIndex: number,
	bIndex: number
) => number;

// Group types
export interface GroupDefinition {
	collapsed?: boolean;
	getter?: (item: any) => string | undefined;
}

export type Group = MultiTag | Partial<Record<MultiTag, GroupDefinition>>;

export type GroupMarker = {
	_isGroupMarker: true;
	key: string;
	collapsed?: boolean;
	group?: string;
	marker?: GroupMarker;
};

export type GroupIterator<T, K> = (
	item: T,
	key: K,
	index: number
) => string | undefined;

// Range type
export enum Range {
	ALL = "all",
	FIRST = "first",
	LAST = "last",
	Year = "year",
}

// Nested group type
export type NestedGroup = { [Key: string]: NestedGroup } & {
	_count?: number;
	_items?: Individuals;
};
