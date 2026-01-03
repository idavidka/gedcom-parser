// Parser
export * from "./utils/parser";
export { default } from "./utils/parser";
export { default as GedcomTree } from "./utils/parser";

// Factories - Pluggable dependencies
export {
	setCacheManagerFactory,
	getCacheManagerFactory,
	resetCacheManagerFactory,
	type CacheManagerFactory,
} from "./factories/cache-factory";

export {
	setKinshipTranslatorClass,
	getKinshipTranslatorClass,
	resetKinshipTranslatorClass,
	type KinshipTranslatorConstructor,
} from "./factories/kinship-factory";

// Cache interface for custom implementations
export type { ICacheManager } from "./utils/cache";

// Kinship translator
export { default as KinshipTranslator } from "./kinship-translator/kinship-translator";
export type { default as IKinshipTranslator } from "./kinship-translator/kinship-translator.interface";
export type { Language } from "./kinship-translator/types";

// Settings
// export * from "./settings";

// Types (Order, Filter, Group, etc.)
export * from "./types/types";

// Place types (simple enum/interface for place filtering)
// export * from "./utils/place-types";
// export { getPlaces } from "./utils/get-places";

// Pluggable Cache Manager (consumer must provide implementation)
// export { setCacheFactory, getInstance } from "./utils/cache-manager";
// export type { ICacheManager, CacheFactory } from "./utils/cache-manager";

// Legacy exports for backward compatibility
// export { setCacheFactory as setIndexedDbFactory } from "./utils/cache-manager";
// export type {
// 	ICacheManager as IIndexedDbManager,
// 	CacheFactory as IndexedDbFactory,
// } from "./utils/cache-manager";

// Classes - export everything from each class
export * from "./classes/common";
export * from "./classes/gedcom";
export * from "./classes/indis";
export * from "./classes/fam";
export * from "./classes/fams";
export * from "./classes/sour";
export * from "./classes/sours";
export * from "./classes/repo";
export * from "./classes/repos";
export * from "./classes/subm";
export * from "./classes/subms";
export * from "./classes/note";
export * from "./classes/name";
export * from "./classes/date";
export * from "./classes/indi";
export * from "./classes/obje";
export * from "./classes/objes";
export * from "./classes/list";

// Class interfaces
export type { default as GedComInterface } from "./interfaces/gedcom";
export type { default as FamInterface } from "./interfaces/fam";
export type { IFamilies as FamsInterface } from "./interfaces/fams";
export type { default as RepoInterface } from "./interfaces/repo";
export type { default as SubmInterface } from "./interfaces/subm";
export type { default as ObjeInterface } from "./interfaces/obje";
export type { IIndividuals as IndisInterface } from "./interfaces/indis";
export type { default as IndiInterface } from "./interfaces/indi";
export type { default as CommonInterface } from "./interfaces/common";
export type { IList as ListInterface } from "./interfaces/list";
export type { default as SourInterface } from "./interfaces/sour";

// Type structures
export type * from "./structures/gedcom";
export type * from "./structures/individual";
export type * from "./structures/family";
export type * from "./structures/source";
export type * from "./structures/repository";
export type * from "./structures/note";
export type * from "./structures/date";
export type { default as IDateStructure } from "./structures/date";
export type * from "./structures/place";
export type * from "./structures/address";
export type * from "./structures/personal-name";
export type * from "./structures/personal-name-pieces";
export type * from "./structures/source-citation";
export type * from "./structures/event-detail-structure";
export type { default as IEventDetailStructure } from "./structures/event-detail-structure";
export type * from "./structures/individual-event-structure";
export type * from "./structures/individual-event-detail-structure";
export type * from "./structures/association";
export type * from "./structures/change-date";
export type * from "./structures/creation-date";
export type * from "./structures/multimedia-link";
export type * from "./structures/non-event";
export type * from "./structures/marriage-date";
export type * from "./structures/lds-ordinance-detail";
export type * from "./structures/lds-spouse-sealing";
export type * from "./structures/source-repository-citation";

// Utils - commonly used utilities
export * from "./utils/cache";
export { getRawSize } from "./utils/get-raw-size";
export * from "./utils/date-formatter";
export * from "./utils/name-formatter";
export * from "./utils/place-parser";
// Range utilities are already exported from types/types
export {
	inRange,
	isIntersectedRange,
	splitRange,
	fromTuple,
	parseRangeBounds,
	isRangeContained,
	extractSplitPoints,
	generateSplitRanges,
	splitOverlappingRanges,
	findMatchingRangeForSplitRange,
	extractSeparationYears,
} from "./utils/range";
