import type { CurrentNameOfTown } from "../settings";
import i18n from "../translation/i18n";

import { getPlaceParts, getCurrentNameOfTown } from "./get-places";
import type { CountryBasedTowns } from "./get-places/country-registry";
import type { Towns } from "./get-places/types";

export const placeTranslator = (
	place?: string | string[],
	level?: number,
	toReversed?: boolean
) => {
	if (!place || (level !== undefined && level > 0)) {
		return typeof place === "string" ? place : place?.join(", ");
	}

	// Convert to string if array
	const placeString = Array.isArray(place) ? place.join(", ") : place;

	// If toReversed is undefined, use legacy behavior (just translate without normalizing)
	if (toReversed === undefined) {
		const parts = placeString.split(/,\s*/);

		if (parts.length > 0) {
			parts[0] = i18n.t(parts[0]);
		}

		if (parts.length > 1) {
			parts[parts.length - 1] = i18n.t(parts[parts.length - 1]);
		}

		return parts.join(", ");
	}

	// When toReversed is explicitly set (true or false),
	// use getPlaceParts to normalize the place (it now handles both formats)
	const placeParts = getPlaceParts(placeString);

	if (!placeParts || placeParts.length === 0) {
		return placeString;
	}

	// Get the first result (getPlaceParts returns an array of possible matches)
	const { leftParts, town, county, country } = placeParts[0];

	// Build the normalized parts array in city-to-country order
	const normalizedParts = [...leftParts, town, county, country].filter(
		Boolean
	) as string[];

	// Translate first and last parts (usually town and country)
	if (normalizedParts.length > 0) {
		normalizedParts[0] = i18n.t(normalizedParts[0]);
	}

	if (normalizedParts.length > 1) {
		normalizedParts[normalizedParts.length - 1] = i18n.t(
			normalizedParts[normalizedParts.length - 1]
		);
	}

	// Return in the requested order
	return (toReversed ? normalizedParts.toReversed() : normalizedParts).join(
		", "
	);
};

/**
 * Translates place with support for current name of town merge mode
 * @param place - The place string or array to translate
 * @param toReversed - Whether to reverse the place name order (country-to-city when true)
 * @param currentNameOfTownMode - The mode for handling current town names ("no", "show", or "merge")
 * @param towns - The town history data for looking up current names
 * @returns The translated and potentially merged place string
 */
export const placeTranslatorWithMerge = (
	place?: string | string[],
	toReversed?: boolean,
	currentNameOfTownMode?: CurrentNameOfTown,
	towns?: Towns | CountryBasedTowns
) => {
	if (!place) {
		return place as string | undefined;
	}

	let displayPlace = place;

	// In merge mode, use current place name if available
	if (currentNameOfTownMode === "merge" && towns) {
		const placeString = Array.isArray(place) ? place.join(", ") : place;
		const currentPlaceData = getCurrentNameOfTown(placeString, towns, true);
		if (currentPlaceData && currentPlaceData.length > 0) {
			// Use the first current place name
			displayPlace = currentPlaceData[0].parts.filter(Boolean).join(", ");
		}
	}

	return placeTranslator(displayPlace, undefined, toReversed);
};
