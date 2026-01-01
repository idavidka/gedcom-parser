/**
 * Core type definitions for GEDCOM parser
 */

// Enums
export enum RelationType {
	BIOLOGICAL = "biological",
	ADOPTED = "adopted",
	FOSTER = "foster",
	SEALING = "sealing",
	BIRTH = "birth",
	STEP = "step",
}

export enum PartnerType {
	SPOUSE = "spouse",
	PARTNER = "partner",
	FRIEND = "friend",
	SINGLE = "single",
	OTHER = "other",
	UNKOWN = "unknown",
}

export enum Range {
	Year = 1,
	FiveYear = 5,
	Decade = 10,
	FiftyYear = 50,
	Century = 100,
}

// ID Key types
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

// NonStandard interface
export interface NonStandard {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	id?: any;
}

// Tags interface (simplified - Common type from classes)
interface Tags {
	_PRIM?: unknown;
	_EXPORTED_FROM_SITE_ID?: unknown;
	_CLON?: unknown;
	_MSER?: unknown;
	_OID?: unknown;
	_LKID?: unknown;
	_PHOTO_RIN?: unknown;
	_MTTAG?: unknown;
	_MTCAT?: unknown;
	_SREL?: unknown;
	_FREL?: unknown;
	_MREL?: unknown;
	_MILT?: unknown;
	_MILTID?: unknown;
	_ORIG?: unknown;
	_LABEL?: unknown;
	_WLNK?: unknown;
	_MARNM?: unknown;
	_INDI?: unknown;
	_GUESSEDORIGINAL?: unknown;
	_FS_LINK?: unknown;
	_FS_ID?: unknown;
	_IS_ORPHAN_FAMILY?: unknown;
	DISPLAYTEXT?: unknown;
	FAM?: unknown;
	INDIVIDUALINTERNALHYPERLINK?: unknown;
	OBJE?: unknown;
	FAMS?: unknown;
	FAMC?: unknown;
	ABBR?: unknown;
	ADDR?: unknown;
	ADR1?: unknown;
	ADR2?: unknown;
	ADOP?: unknown;
	AFN?: unknown;
	AGE?: unknown;
	ALIA?: unknown;
	ANUL?: unknown;
	ARVL?: unknown;
	AUTH?: unknown;
	BAPL?: unknown;
	BAPM?: unknown;
	BARM?: unknown;
	BASM?: unknown;
	BIRT?: unknown;
	CAST?: unknown;
	CAUS?: unknown;
	CENS?: unknown;
	CHIL?: unknown;
	CHR?: unknown;
	CHRA?: unknown;
	CITY?: unknown;
	CONC?: unknown;
	CONF?: unknown;
	CONT?: unknown;
	CONL?: unknown;
	CORP?: unknown;
	CTRY?: unknown;
	DATE?: unknown;
	YEAR?: unknown;
	MONTH?: unknown;
	DAY?: unknown;
	DEAT?: unknown;
	DESC?: unknown;
	DIV?: unknown;
	DIVF?: unknown;
	DSCR?: unknown;
	EDUC?: unknown;
	EMIG?: unknown;
	ENDL?: unknown;
	ENGA?: unknown;
	EVEN?: unknown;
	FCOM?: unknown;
	FOST?: unknown;
	GIVN?: unknown;
	GRAD?: unknown;
	HEAD?: unknown;
	HUSB?: unknown;
	ILLE?: unknown;
	IMMI?: unknown;
	INDI?: unknown;
	LANG?: unknown;
	LEGA?: unknown;
	LVG?: unknown;
	MARB?: unknown;
	MARC?: unknown;
	MARL?: unknown;
	MARR?: unknown;
	MARS?: unknown;
	MISC?: unknown;
	NAME?: unknown;
	NATI?: unknown;
	NATU?: unknown;
	NICK?: unknown;
	NOTE?: unknown;
	NPFX?: unknown;
	NSFX?: unknown;
	OCCU?: unknown;
	OCCUPATION?: unknown;
	OCCUPATIONS?: unknown;
	ORDI?: unknown;
	ORDL?: unknown;
	ORDN?: unknown;
	PEDI?: unknown;
	PART?: unknown;
	PHON?: unknown;
	PLAC?: unknown;
	POST?: unknown;
	PRIV?: unknown;
	PROB?: unknown;
	RACE?: unknown;
	RELI?: unknown;
	RESI?: unknown;
	RETI?: unknown;
	SEX?: unknown;
	SLGC?: unknown;
	SLGS?: unknown;
	SOUR?: unknown;
	SPFX?: unknown;
	SSN?: unknown;
	STAE?: unknown;
	STAT?: unknown;
	STIL?: unknown;
	SUBM?: unknown;
	SURN?: unknown;
	REPO?: unknown;
	TEL?: unknown;
	TEMP?: unknown;
	TIME?: unknown;
	TITL?: unknown;
	WIFE?: unknown;
	WILL?: unknown;
	RIN?: unknown;
	FILE?: unknown;
	AKA?: unknown;
	FACT?: unknown;
	TYPE?: unknown;
	VERS?: unknown;
	FORM?: unknown;
	WWW?: unknown;
	BAPT?: unknown;
	CHRI?: unknown;
	BURI?: unknown;
}

// Tag types
export type Tag = keyof Tags | keyof NonStandard;
export type ListTag = `@@${keyof Tags}`;
export type MultiTag = ListTag | Tag | `${Tag}.${Tag}`;

// Filter types
export type FilterIterator<T, K> = (
	item: T,
	key: K | number,
	index: number
) => boolean;

export type Filter<T = unknown> = Partial<Record<MultiTag, T>>;

export type RequiredFilter<T extends Tag, F = unknown> = Required<
	Pick<Filter<F>, T>
> &
	Partial<Omit<Filter<F>, T>>;

// Order types
export interface OrderDefinition {
	direction: "ASC" | "DESC";
	getter?: (orig: unknown, raw?: unknown) => unknown;
}

export type Order = MultiTag | Partial<Record<MultiTag, OrderDefinition>>;

export type OrderIterator<T, K> = (
	itemA: T,
	keyA: K | number,
	itemB: T,
	keyB: K | number
) => number;

// Group types
export interface GroupDefinition {
	getter?: (orig: unknown, raw?: unknown) => unknown;
}

export type Group = MultiTag | Partial<Record<MultiTag, GroupDefinition>>;

export type GroupIterator<T, K> = (
	item: T,
	key: K | number
) => string | string[] | GroupMarker[];

export type NestedGroup = { [Key: string]: NestedGroup } & {
	items?: unknown; // Will be Individuals from classes
	length?: number;
};

// Group marker type
export type GroupMarker = {
	marker?: string;
	group: string;
};

// Position and Size types (for visualization - optional)
export type Position = {
	x: number;
	y: number;
};

export type Size = {
	width: number;
	height: number;
};
