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
