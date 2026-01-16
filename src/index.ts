// Parser
export * from "./utils/parser";
export { default } from "./utils/parser";
export { default as GedcomTree } from "./utils/parser";

// Factories - Pluggable dependencies
export * from "./factories";

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
