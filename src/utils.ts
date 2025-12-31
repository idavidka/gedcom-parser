/**
 * Utility functions for GEDCOM parser
 */

// Date formats accepted by the parser
export const ACCEPTED_DATE_FORMATS = [
	"yyyy.MM.dd.",
	"yyyy-MM-dd",
	"MM/dd/yyyy",
];

// Range type for date ranges
export interface Range {
	min?: number;
	max?: number;
}

// Check if a range is valid
export const isValidRange = (range?: Range): boolean => {
	if (!range) {
		return false;
	}
	return range.min !== undefined || range.max !== undefined;
};

// Check if a year is in a given range
export const inRange = (
	year: string | number | undefined,
	range: Range,
	trueIfNoYear = false
) => {
	if (!isValidRange(range)) {
		return false;
	}
	if (year === undefined) {
		return trueIfNoYear;
	}
	const yearNum = typeof year === "string" ? parseInt(year, 10) : year;
	if (isNaN(yearNum)) {
		return false;
	}
	if (range.min !== undefined && yearNum < range.min) {
		return false;
	}
	if (range.max !== undefined && yearNum > range.max) {
		return false;
	}
	return true;
};

// Date formatter stub (can be overridden by host application)
export const dateFormatter = (date: string): string => date;

// Name formatter stub (can be overridden by host application)
export const nameFormatter = (name: string): string => name;

// Place translator stub (can be overridden by host application)
export const placeTranslator = (place: string): string => place;

// Get place parts stub (can be overridden by host application)
export const getPlaceParts = (place: string): string[] => place.split(",").map((p) => p.trim());

// Set nested group stub (can be overridden by host application)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setNestedGroup = (group: any, key: string, value: any): void => {
	group[key] = value;
};

// Get version stub (can be overridden by host application)
export const getVersion = (): string => "1.0.0";

// Implemented stub (can be overridden by host application)
export const implemented = (_feature: string): void => {
	// Stub implementation - do nothing
	// console.log(`Feature ${feature} is implemented`);
};


// Place type enum
export enum PlaceType {
	All = "all",
	Birth = "birth",
	Death = "death",
	Residence = "residence",
	Marriage = "marriage",
	Other = "other",
}

// Place interface
export interface Place {
	type: PlaceType;
	value: string;
	place: string; // Full place string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parts: any[];
}

// Get places stub (can be overridden by host application)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPlaces = (indi: any, type: PlaceType | PlaceType[], _maxLevel = 1): Place[] => {
	// Stub implementation - returns empty array
	// Real implementation should extract places from individual records
	return [];
};


// Cache stub implementations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pathCache = (key: string, value?: any): any => {
	// Stub implementation - no caching
	return value;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const relativesCache = (_cacheName: string) => (key: string, value?: any): any => {
	// Stub implementation - no caching
	return value;
};

