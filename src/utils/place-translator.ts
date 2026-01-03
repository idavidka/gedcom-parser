/**
 * Place translator stub for gedcom-parser
 * This is a minimal no-op implementation - consumer apps can implement translation if needed
 */

export const placeTranslator = (place: string | string[]): string => {
	// No-op stub - return place as-is (join if array)
	return Array.isArray(place) ? place.join(", ") : place;
};
