/**
 * @treeviz/gedcom-parser
 * 
 * A TypeScript library for parsing and manipulating GEDCOM genealogy files.
 */

// Main parser
export { default as GedcomParser } from "./parser";
export { default } from "./parser";

// Classes
export { Common, createCommon, getListTag, isId } from "./classes/common";
export { CommonDate, createCommonDate } from "./classes/date";
export { Fam, createFam } from "./classes/fam";
export { Families } from "./classes/fams";
export { GedCom, createGedCom } from "./classes/gedcom";
export type { GedComType } from "./classes/gedcom";
export { Indi, createIndi } from "./classes/indi";
export type { IndiType } from "./classes/indi";
export { IndiWithDimension } from "./classes/indi-with-dimension";
export { Individuals } from "./classes/indis";
export { List } from "./classes/list";
export { CommonName, createCommonName } from "./classes/name";
export { CommonNote, createCommonNote } from "./classes/note";
export { Obje, createObje } from "./classes/obje";
export { Objects } from "./classes/objes";
export { Repo, createRepo } from "./classes/repo";
export { Repositories } from "./classes/repos";
export { Sour, createSour } from "./classes/sour";
export { Sources } from "./classes/sours";
export { Subm, createSubm } from "./classes/subm";
export { Submitters } from "./classes/subms";

// Types
export type {
	ConvertType,
	IndiKey,
	FamKey,
	ObjeKey,
	RepoKey,
	SourKey,
	SubmKey,
	TagKey,
	UnknownKey,
	IdType,
	RelationType,
	PartnerType,
	NonStandard,
	Tag,
	ListTag,
	MultiTag,
	ParseSettings,
	FilterIterator,
	Filter,
	RequiredFilter,
	OrderDefinition,
	Order,
	OrderIterator,
	GroupDefinition,
	Group,
	GroupMarker,
	GroupIterator,
	NestedGroup,
} from "./types";
export { Range } from "./types";

// Constants
export {
	REF_LINE_REG,
	LINE_REG,
	ID_REG,
	ID_GETTER_REG,
	ID_SPLIT_REG,
	MAX_FILE_SIZE_TO_SYNC,
	getDefaultDateFnsLocale,
} from "./constants";

// Utilities
export { ACCEPTED_DATE_FORMATS, inRange, isValidRange } from "./utils";
export type { Range as DateRange } from "./utils";

// Creator helper
export { create } from "./common-creator";
