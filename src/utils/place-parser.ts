/**
 * Minimal place parsing stub for gedcom-parser
 * This is a simplified version - consumer apps can implement full place parsing if needed
 */

export interface PlaceParts {
	leftParts?: string[];
	town?: string;
	county?: string;
	country?: string;
}

/**
 * Simple place parser - splits by commas
 * Consumer apps can implement more sophisticated parsing if needed
 */
export const getPlaceParts = (place: string | (string | undefined)[] = []): PlaceParts[] => {
	const partsString = Array.isArray(place)
		? place.filter(Boolean).join(", ")
		: place;

	if (!partsString) {
		return [{}];
	}

	// Simple split by comma
	const parts = partsString.split(/,\s*/).map((p) => p.trim()).filter(Boolean);

	if (parts.length === 0) {
		return [{}];
	}

	// Simple heuristic: last part is country, second-to-last is county, rest is town/city
	const result: PlaceParts = {};

	if (parts.length === 1) {
		result.town = parts[0];
	} else if (parts.length === 2) {
		result.town = parts[0];
		result.country = parts[1];
	} else if (parts.length === 3) {
		result.town = parts[0];
		result.county = parts[1];
		result.country = parts[2];
	} else {
		// More than 3 parts - put extras in leftParts
		result.leftParts = parts.slice(0, parts.length - 3);
		result.town = parts[parts.length - 3];
		result.county = parts[parts.length - 2];
		result.country = parts[parts.length - 1];
	}

	return [result];
};
