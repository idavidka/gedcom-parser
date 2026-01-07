// Parser
export * from "./utils/parser";
export { default } from "./utils/parser";
export { default as GedcomTree } from "./utils/parser";

// Unified initialization (recommended)
export {
	initGedcomParser,
	isGedcomParserInitialized,
	getGedcomParserFactories,
	type GedcomParserFactories,
} from "./init";

// Factories - Pluggable dependencies (individual setters)
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

export {
	setDateLocaleProvider,
	getDateLocale,
	resetDateLocaleProvider,
	type DateLocaleProvider,
} from "./factories/date-locale-factory";

export {
	setI18nProvider,
	getI18n,
	resetI18nProvider,
	type I18nProvider,
} from "./factories/i18n-factory";

export {
	setPlaceParserProvider,
	getPlaceParserProvider,
	resetPlaceParserProvider,
	type PlaceParserFunction,
} from "./factories/place-parser-provider";

export {
	setPlaceTranslatorProvider,
	getPlaceTranslatorProvider,
	resetPlaceTranslatorProvider,
	type PlaceTranslatorFunction,
} from "./factories/place-translator-provider";

// Cache interface for custom implementations
export type { ICacheManager } from "./utils/cache";

// Kinship translator
export * from "./kinship-translator";

// Settings and types - exports enum Range
export * from "./types";

// Constants - sorting, filtering, etc.
export * from "./constants";

// Classes - export everything
export * from "./classes";

// Class interfaces
export * from "./interfaces";

// Type structures
export * from "./structures";

// Factories - Pluggable dependencies
export * from "./factories";

// Utils - commonly used utilities
// Export type Range with alias to avoid conflict with enum Range from types
export type {
	PrimitiveRange,
	Range as RangeType,
	SplitResult,
} from "./utils/range";

// Export range functions explicitly to avoid type Range conflict
export {
	fromTuple,
	inRange,
	isIntersectedRange,
	splitRange,
	parseRangeBounds,
	isRangeContained,
	extractSplitPoints,
	generateSplitRanges,
	splitOverlappingRanges,
	findMatchingRangeForSplitRange,
	extractSeparationYears,
} from "./utils/range";

// Export rest of utils (functions and other exports)
export * from "./utils/cache";
export * from "./utils/common-creator";
export * from "./utils/date-formatter";
export * from "./utils/get-all-prop";
export * from "./utils/get-family-with";
export * from "./utils/get-places";
export * from "./utils/get-product-details";
export { getRawSize } from "./utils/get-raw-size";
export * from "./utils/logger";
export * from "./utils/name-formatter";
export * from "./utils/nested-group";
export * from "./utils/ordinalize";
export * from "./utils/place-parser";
export * from "./utils/place-translator";
