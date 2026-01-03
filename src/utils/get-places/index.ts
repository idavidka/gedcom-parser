/**
 * Minimal getPlaces implementation for gedcom-parser
 * Extracts place information from GEDCOM PLAC tags
 */

import { type Place, PlaceType } from "../place-types";

/**
 * Extract places from an individual's GEDCOM data
 * This is a minimal implementation that only reads PLAC tags
 * For advanced place matching/geocoding, use the main project's implementation
 */
export function getPlaces(
	indi: unknown,
	type: PlaceType | PlaceType[] = [PlaceType.All],
	maxLevel = 1
): Place[] {
	if (!indi) return [];

	const types = Array.isArray(type) ? type : [type];
	const places: Place[] = [];

	const addPlace = (raw: unknown, placeType: PlaceType, source?: string) => {
		if (!raw || typeof raw !== "string") return;
		const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
		places.push({
			type: placeType,
			raw,
			parts,
			level: maxLevel,
			source,
		});
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const indiAny = indi as any;

	// Birth place
	if (types.includes(PlaceType.All) || types.includes(PlaceType.Birth)) {
		const birthPlace = indiAny.get?.("BIRT.PLAC")?.toValue();
		if (birthPlace) {
			addPlace(birthPlace, PlaceType.Birth, "BIRT.PLAC");
		}
	}

	// Death place
	if (types.includes(PlaceType.All) || types.includes(PlaceType.Death)) {
		const deathPlace = indiAny.get?.("DEAT.PLAC")?.toValue();
		if (deathPlace) {
			addPlace(deathPlace, PlaceType.Death, "DEAT.PLAC");
		}
	}

	// Marriage places
	if (types.includes(PlaceType.All) || types.includes(PlaceType.Marriage)) {
		const families = indiAny.getFamilies?.("FAMS");
		if (families && typeof families.forEach === "function") {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			families.forEach((fam: any) => {
				const marriagePlace = fam.get?.("MARR.PLAC")?.toValue();
				if (marriagePlace) {
					addPlace(marriagePlace, PlaceType.Marriage, "MARR.PLAC");
				}
			});
		}
	}

	return places;
}
