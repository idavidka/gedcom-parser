import type { Common } from "../classes/common";
import type { Individuals } from "../classes/indis";

export type ConvertType =
	| "FAM"
	| "INDI"
	| "_INDI"
	| "OBJE"
	| "SOUR"
	| "REPO"
	| "SUBM"
	| "SNOTE"
	| "NOTE";

export type IndiKey = `@${"I" | "P" | "XI" | "XXI"}${number}@`;
export type FamKey = `@${"F" | "XF" | "XXF"}${number}@`;
export type ObjeKey = `@O${number}@`;
export type RepoKey = `@R${number}@`;
export type SourKey = `@S${number}@`;
export type SubmKey = `@SUBM${number}@`;
export type SnoteKey = `@N${number}@`;
export type TagKey = `@T${number}@`;
export type UnknownKey = `@U${number}@`;
export type IdType =
	| IndiKey
	| FamKey
	| ObjeKey
	| SourKey
	| RepoKey
	| SubmKey
	| SnoteKey
	| UnknownKey;

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

export interface NonStandard {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value?: any; // Specific type for value, not part of GEDCOM standard
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	id?: any;
}

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
	_ORIGHEAD?: Common;
	_LABEL?: Common;
	_WLNK?: Common;
	_MARNM?: Common;
	_UID?: Common;
	_TID?: Common;
	_TREE?: Common;
	_ENV?: Common;
	_INDI?: Common; // Individual
	_GUESSEDORIGINAL?: Common;
	_FS_LINK?: Common; // Legacy: FamilySearch link (now stored in WWW with _IS_FS Y marker)
	_FS_ID?: Common; // FamilySearch ID
	_FS_MATCH?: Common; // Legacy: FamilySearch Matches (now stored in MATCH with _IS_FS Y marker)
	_FS_SOUR?: Common; // Legacy: FamilySearch Sources marker (now _IS_FS Y)
	_IS_FS?: Common<"Y" | "N">; // Marks FamilySearch-sourced data (replaces _FS_SOUR)
	_IS_ORPHAN_FAMILY?: Common<"Y" | "N">;
	MATCH?: Common; // Match entries (replaces _FS_MATCH, has _IS_FS Y marker)
	SCORE?: Common; // Match score
	TEXT?: Common; // Match citation text
	REF?: Common; // Match reference ID
	DISPLAYTEXT?: Common;

	FAM?: Common;
	INDIVIDUALINTERNALHYPERLINK?: Common;
	OBJE?: Common;
	FAMS?: Common; // Family where perons is a spouse
	FAMC?: Common; // Family where perons is a children
	ABBR?: Common; // Abbreviation for a name or title
	ADDR?: Common; // Address, usually mailing address
	ADR1?: Common; // First line of an address
	ADR2?: Common; // Second line of an address
	ADOP?: Common; // Adoption
	AFN?: Common; // Ancestral File number (LDS)
	AGE?: Common; // Age at time of event
	ALIA?: Common; // Alias
	ANUL?: Common; // Annulment
	ARVL?: Common; // Arrival
	AUTH?: Common; // Author of the information
	BAPL?: Common; // LDS baptism
	BAPM?: Common; // Baptism
	BARM?: Common; // Bar Mitzvah
	BASM?: Common; // Bas (or Bat) Mitzvah
	BIRT?: Common; // Birth
	CAST?: Common; // Caste
	CAUS?: Common; // Cause of event, such as death
	CENS?: Common; // Census
	CHIL?: Common; // Child -- natural or adopted
	CHR?: Common; // Christening
	CHRA?: Common; // Adult Christening
	CITY?: Common; // City
	CONC?: Common; // Continue with the previous text; do not leave spaces
	CONF?: Common; // Confirmation
	CONT?: Common; // Content of note
	CONL?: Common; // LDS Confirmation
	CORP?: Common; // Corporation information
	CTRY?: Common; // Country (name or code)
	DATE?: Common; // Date
	YEAR?: Common; // Date
	MONTH?: Common; // Date
	DAY?: Common; // Date
	DEAT?: Common; // Death
	DESC?: Common; // Descendants
	DIV?: Common; // Divorce
	DIVF?: Common; // Divorce filed
	DSCR?: Common; // Physical description of a person, place, or thing
	EDUC?: Common; // Education
	EMIG?: Common; // Emigration
	EMAIL?: Common; // Email address
	ENDL?: Common; // Endowment (LDS)
	ENGA?: Common; // Engagement
	EVEN?: Common; // Event (noteworthy event)
	FCOM?: Common; // First Communion
	FOST?: Common; // Foster
	GIVN?: Common; // Given name
	GRAD?: Common; // Graduation
	HEAD?: Common; // Header
	HUSB?: Common; // Husband
	ILLE?: Common; // Illegitimate
	IMMI?: Common; // Immigration
	INDI?: Common; // Individual
	LANG?: Common; // Language
	LEGA?: Common; // Legatee
	LVG?: Common; // Living
	MARB?: Common; // Marriage banns
	MARC?: Common; // Marriage contract
	MARL?: Common; // Marriage license
	MARR?: Common; // Marriage
	MARS?: Common; // Marriage settlement
	MISC?: Common; // Miscellaneous
	NAME?: Common; // Name
	NATI?: Common; // Nationality
	NATU?: Common; // Naturalization
	NICK?: Common; // Nickname
	NMR?: Common; // Number of marriages
	NO?: Common; // Did not happen (GEDCOM 7 non-event)
	NOTE?: Common; // Additional information
	NPFX?: Common; // Name prefix
	NSFX?: Common; // Name suffix (Jr. or Sr. etc.)
	OCCU?: Common; // Occupation
	OCCUPATION?: Common; // Occupation
	OCCUPATIONS?: Common; // Occupation
	ORDI?: Common; // Ordinance (religious)
	ORDL?: Common; // Ordination (LDS)
	ORDN?: Common; // Ordination (non-LDS)
	PEDI?: Common; // Pedigree
	PEDT?: Common; // GEDCOM 7 pedigree (treated as PEDI)
	PART?: Common; // Partner
	PHON?: Common; // Phone number
	FAX?: Common; // Fax number
	PHRASE?: Common; // Free-text for non-enum payloads (GEDCOM 7)
	PLAC?: Common; // Place
	POST?: Common; // Postal code
	PRIV?: Common; // Private
	PROB?: Common; // Probate
	RACE?: Common; // Race
	RELI?: Common; // Religion (denomination)
	RESI?: Common; // Residence
	RESN?: Common; // Restriction notice (GEDCOM 7)
	RETI?: Common; // Retirement
	ROLE?: Common; // Role in association/event (GEDCOM 7)
	SEX?: Common<"F" | "M" | "U" | "X" | "N">; // Sex
	SLGC?: Common; // Sealing of a child (LDS)
	SLGS?: Common; // Sealing of a spouse (LDS)
	SNOTE?: Common; // Shared note (GEDCOM 7)
	SOUR?: Common; // Source
	SPFX?: Common; // Surname prefix
	SSN?: Common; // Social Security number
	STAE?: Common; // State
	STAT?: Common; // Statistics
	STIL?: Common; // Stillborn
	SUBM?: Common; // Submitter
	SURN?: Common; // Surname
	REPO?: Common; // Repository
	TEL?: Common; // Telephone Number
	TEMP?: Common; // Temple (LDS)
	TIME?: Common; // Time
	TITL?: Common; // Title
	UID?: Common; // Unique identifier (GEDCOM 7)
	WIFE?: Common; // Wife
	WILL?: Common; // Will,
	RIN?: Common;
	FILE?: Common;
	AKA?: Common;
	FACT?: Common;
	TYPE?: Common;
	VERS?: Common;
	FORM?: Common;
	WWW?: Common;
	URL?: Common;
	BAPT?: Common;
	CHRI?: Common;
	BURI?: Common;
	CREM?: Common;
	BLES?: Common;
	PROP?: Common;
	GEDC?: Common;
	RFN?: Common;
	CREA?: Common; // Creation metadata (GEDCOM 7)
	CHAN?: Common; // Change metadata (GEDCOM 7)
	SCHMA?: Common; // Schema metadata (GEDCOM 7)
	TAG?: Common; // Tag metadata (GEDCOM 7)
	ASSO?: Common; // Association (GEDCOM 7)
	MEDI?: Common; // Media type (GEDCOM 5.5.1 sibling of FORM)
	CHAR?: Common; // Character set (GEDCOM 5.x HEAD)
	SDATE?: Common; // Sort date (GEDCOM 7)
}

export type Tag = keyof Tags | keyof NonStandard;
export type ListTag = `@@${keyof Tags}`;
/** Dot paths may nest deeper than two levels (e.g. FILE.FORM.TYPE). */
export type MultiTag = ListTag | Tag | `${Tag}.${string}`;

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

export interface OrderDefinition {
	direction: "ASC" | "DESC";
	getter?: (orig: unknown, raw?: Common) => unknown;
}
export type Order = MultiTag | Partial<Record<MultiTag, OrderDefinition>>;

export type OrderIterator<T, K> = (
	itemA: T,
	keyA: K | number,
	itemB: T,
	keyB: K | number
) => number;

export interface GroupDefinition {
	getter?: (orig: unknown, raw?: Common) => unknown;
}

export type Group = MultiTag | Partial<Record<MultiTag, GroupDefinition>>;
export type GroupMarker = {
	marker?: string;
	group: string;
};

export type GroupIterator<T, K> = (
	item: T,
	key: K | number
) => string | string[] | GroupMarker[];

export enum Range {
	Year = 1,
	FiveYear = 5,
	Decade = 10,
	FiftyYear = 50,
	Century = 100,
}

export type NestedGroup = { [Key: string]: NestedGroup } & {
	items?: Individuals;
	length?: number;
};

export type NameOrder = "first-last" | "last-first";
export type PlaceOrder = "country-to-city" | "city-to-country";
export type LinkedPersons = "merge" | "clone" | "skip";
