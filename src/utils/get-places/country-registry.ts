/* eslint-disable import/order */
/**
 * Country Registry Module
 *
 * This module provides a registry system for country-specific place data.
 * It allows the application to support multiple countries by organizing
 * county and town data in country-specific folders.
 */

import huCountries from "../../translation/hu-countries.json";
import deCountries from "../../translation/de-countries.json";
import frCountries from "../../translation/fr-countries.json";
import esCountries from "../../translation/es-countries.json";
import enCountries from "../../translation/en-countries.json";

// Country data imports
import huCounties from "../../sources/hungary/counties.json";
import huTowns2020 from "../../sources/hungary/towns-2020.json";
import huTowns1913 from "../../sources/hungary/towns-1913.json";
import huTownsDetailed from "../../sources/hungary/towns-detailed.json";

import atCounties from "../../sources/austria/counties.json";
import atTowns1910 from "../../sources/austria/towns-at-1910.json";
import atTownsLatest from "../../sources/austria/towns-at-latest.json";
import atTownsDetailed from "../../sources/austria/towns-detailed.json";

import type { Ranges, Towns, Town } from "./types";
import {
	splitOverlappingRanges,
	findMatchingRangeForSplitRange,
	type PrimitiveRange,
} from "../range";

export interface CountryTranslations {
	[key: string]: string;
}

export interface CountyData {
	[key: string]: string;
}

export interface TownSource {
	_source: {
		en: string;
		hu: string;
	};
	_year?: number;
	data: Record<
		string,
		{
			county: string;
			map?: string;
			orig?: string;
		}
	>;
}

export interface LetterVariants {
	[key: string]: string;
}

export interface CountryData {
	name: string;
	translations: CountryTranslations;
	counties?: CountyData;
	townSources?: TownSource[];
	townsDetailed?: Towns;
	letterVariants?: LetterVariants;
}

/**
 * Registry of supported countries with their data
 * Key is the English country name (e.g., "Hungary", "Romania", "Austria")
 */
const countryRegistry: Map<string, CountryData> = new Map();

/**
 * Register a country in the registry
 * This helper function makes it easy to add new countries
 */
export function registerCountry(countryData: CountryData): void {
	countryRegistry.set(countryData.name, countryData);
}

// Register countries - order matters for detection priority
// More specific/smaller translation files should come first

registerCountry({
	name: "United States",
	translations: enCountries as CountryTranslations,
});

registerCountry({
	name: "Germany",
	translations: deCountries as CountryTranslations,
});

registerCountry({
	name: "France",
	translations: frCountries as CountryTranslations,
});

registerCountry({
	name: "Spain",
	translations: esCountries as CountryTranslations,
});

registerCountry({
	name: "Romania",
	translations: {
		Romania: "Románia",
		Románia: "Romania",
	},
});

// Register Hungary with full data (counties, towns, etc.)
registerCountry({
	name: "Hungary",
	translations: huCountries as CountryTranslations,
	counties: huCounties as CountyData,
	townSources: [
		huTowns2020 as unknown as TownSource,
		huTowns1913 as unknown as TownSource,
	],
	townsDetailed: huTownsDetailed as unknown as Towns,
	letterVariants: {
		c: "cz",
	},
});

// Register Austria with full data (counties, towns, etc.)
registerCountry({
	name: "Austria",
	translations: deCountries as CountryTranslations, // Austria uses German translations
	counties: atCounties as CountyData,
	townSources: [
		atTownsLatest as unknown as TownSource,
		atTowns1910 as unknown as TownSource,
	],
	townsDetailed: atTownsDetailed as unknown as Towns,
});

/**
 * Get country data by country name
 */
export function getCountryData(countryName: string): CountryData | undefined {
	return countryRegistry.get(countryName);
}

/**
 * Get all country translations (merged from all countries)
 * Note: This function collects all unique translation values, but doesn't preserve
 * the key-to-value mapping when keys are duplicated across countries.
 * For country name detection, use isCountryName() which checks all countries.
 */
export function getAllCountryTranslations(): CountryTranslations {
	const merged: CountryTranslations = {};

	countryRegistry.forEach((data) => {
		Object.assign(merged, data.translations);
	});

	return merged;
}

/**
 * Detect country name from input string
 * Returns the standardized English country name if found
 */
export function detectCountryName(countryName?: string): string | undefined {
	if (!countryName) {
		return undefined;
	}

	const lowerName = countryName.toLowerCase();

	// First pass: Special check for English translations (en-countries.json)
	// If the input is a KEY in enCountries, return the VALUE (or matching registered name)
	for (const [key, value] of Object.entries(enCountries)) {
		if (key.toLowerCase() === lowerName) {
			// Check if the value matches a registered country name
			for (const registeredName of countryRegistry.keys()) {
				if (
					typeof value === "string" &&
					value.toLowerCase().startsWith(registeredName.toLowerCase())
				) {
					return registeredName;
				}
			}
			// No registered match, return the value as-is
			return typeof value === "string" ? value : undefined;
		}
	}

	// Second pass: Check translations where the country is the PRIMARY subject
	// This checks if the input is a KEY in any country's translations
	for (const [_name, data] of countryRegistry.entries()) {
		// Check if this exact name is a KEY in the translations (not just a value)
		for (const key of Object.keys(data.translations)) {
			if (key.toLowerCase() === lowerName) {
				return key;
			}
		}
	}

	// Third pass: Check translation values, but only for exact matches
	// where the VALUE points back to the country's OWN name
	for (const [name, data] of countryRegistry.entries()) {
		for (const [key, value] of Object.entries(data.translations)) {
			if (value.toLowerCase() === lowerName) {
				// Found as a value, but check if the KEY is the country's own name
				// This ensures "Ungarn" (value) points to "Hungary" (key), not "Germany"
				if (key === name) {
					return key;
				}
			}
		}
	}

	// Fourth pass: Check raw translation files for unregistered countries
	// This allows us to detect countries like "Romania" that appear in translations
	// but aren't fully registered in the country registry
	const allTranslationFiles = [
		huCountries,
		deCountries,
		frCountries,
		esCountries,
		enCountries,
	];

	for (const translations of allTranslationFiles) {
		for (const [key, value] of Object.entries(translations)) {
			if (
				typeof value === "string" &&
				(key.toLowerCase() === lowerName ||
					value.toLowerCase() === lowerName)
			) {
				// Use the key (which is the English name) as the standardized name
				// If the match was on the value, we need to find the corresponding key
				if (key.toLowerCase() === lowerName) {
					return key;
				} else {
					// Match was on value, find the key
					for (const [englishName, translatedName] of Object.entries(
						translations
					)) {
						if (
							typeof translatedName === "string" &&
							translatedName.toLowerCase() === lowerName
						) {
							return englishName;
						}
					}
				}
			}
		}
	}

	// No country detected
	return undefined;
}

/**
 * Get counties for a specific country
 */
export function getCountiesForCountry(
	countryName: string
): CountyData | undefined {
	const data = countryRegistry.get(countryName);
	return data?.counties;
}

/**
 * Get town sources for a specific country
 */
export function getTownSourcesForCountry(
	countryName: string
): TownSource[] | undefined {
	const data = countryRegistry.get(
		detectCountryName(countryName) || countryName
	);
	return data?.townSources;
}

/**
 * Get detailed towns data for a specific country
 */
export function getDetailedTownsForCountry(
	countryName: string
): Towns | undefined {
	const data = countryRegistry.get(countryName);
	return data?.townsDetailed;
}

/**
 * Get all detailed towns data from all registered countries
 * Returns an array of {countryName, towns} objects
 */
export function getAllDetailedTowns(): Array<{
	countryName: string;
	towns: Towns;
}> {
	const result: Array<{
		countryName: string;
		towns: Towns;
	}> = [];

	countryRegistry.forEach((data, countryName) => {
		if (data.townsDetailed) {
			result.push({
				countryName,
				towns: data.townsDetailed,
			});
		}
	});

	return result;
}

/**
 * Structure for country-based location data
 * Top-level keys are countries, each containing town data directly
 */
export interface CountryBasedTowns {
	[countryName: string]: Towns;
}

/**
 * Get combined towns detailed data from all countries with country-based structure
 * Returns a structure where top-level keys are countries, and each country maps directly to its towns
 * Each town appears only under its own country - no transformation or merging across countries
 *
 * @returns CountryBasedTowns with structure: {[country]: {[townKey]: TownData}}
 */
export function getCombinedDetailedTownsByCountry(): CountryBasedTowns {
	const result: CountryBasedTowns = {};

	countryRegistry.forEach((countryData, countryName) => {
		if (!countryData.townsDetailed) return;

		// Simply assign the towns data for this country without transformation
		// Keep simple string declarations unchanged, preserve complex structures as-is
		result[countryName] = countryData.townsDetailed;
	});

	return result;
}

/**
 * Convert country-based structure back to flat Towns structure
 * Merges all countries' towns into a single flat structure with proper range splitting
 * Used for backward compatibility with validators and other code expecting flat structure
 *
 * This function produces the same result as getCombinedDetailedTowns() - it properly
 * splits overlapping ranges and preserves country information in each Town object.
 *
 * @param countryBased Country-based towns structure
 * @returns Flat Towns structure with proper range splitting (same format as getCombinedDetailedTowns)
 */
export function convertCountryBasedToFlat(
	countryBased: CountryBasedTowns
): Towns {
	// First pass: collect all town data by country (similar to getCombinedDetailedTowns)
	const townDataByCountry: Record<
		string,
		Array<{
			countryName: string;
			countryData: CountryData;
			townData: Partial<Ranges> | string;
		}>
	> = {};

	Object.entries(countryBased).forEach(([countryName, countryTowns]) => {
		// Create a minimal CountryData object for the conversion
		const countryData: CountryData = {
			name: countryName,
			translations: { en: countryName },
			townsDetailed: countryTowns,
		};

		Object.entries(countryTowns).forEach(([townName, townData]) => {
			if (!townDataByCountry[townName]) {
				townDataByCountry[townName] = [];
			}
			townDataByCountry[townName].push({
				countryName,
				countryData,
				townData,
			});
		});
	});

	// Second pass: process each town with proper range splitting (same as getCombinedDetailedTowns)
	const result: Towns = {};

	Object.entries(townDataByCountry).forEach(([townName, countriesData]) => {
		if (countriesData.length === 1) {
			// Single country - no splitting needed, just add country info
			const { countryData, townData } = countriesData[0];
			result[townName] = addCountryInfoToTownData(
				townData,
				townName,
				countryData
			);
		} else {
			// Multiple countries - need range splitting
			result[townName] = mergeTownDataWithRangeSplitting(
				townName,
				countriesData
			);
		}
	});

	return result;
}

/**
 * Get combined towns detailed data from all countries (LEGACY)
 * Returns a flat structure where town names are top-level keys
 *
 * NOTE: This function is kept for backward compatibility.
 * New code should use getCombinedDetailedTownsByCountry() for country-scoped data.
 *
 * Handles duplicate town names by properly splitting overlapping ranges and merging data.
 *
 * This function implements proper range splitting logic similar to getSeparationYears:
 * 1. Collects all ranges from all countries for each town
 * 2. Finds all split points where ranges start/end
 * 3. Creates new split ranges for each segment
 * 4. For each split range, collects data from all countries that have data for that period
 * 5. Stores as arrays when multiple countries have data for the same time period
 *
 * @returns Towns Record with properly merged and split data from all countries
 */
export function getCombinedDetailedTowns(): Towns {
	// First pass: collect all town data by country
	const townDataByCountry: Record<
		string,
		Array<{
			countryName: string;
			countryData: CountryData;
			townData: Partial<Ranges> | string;
		}>
	> = {};

	countryRegistry.forEach((countryData, _countryName) => {
		if (!countryData.townsDetailed) return;

		Object.entries(countryData.townsDetailed).forEach(
			([townName, townData]) => {
				if (!townDataByCountry[townName]) {
					townDataByCountry[townName] = [];
				}
				townDataByCountry[townName].push({
					countryName: countryData.name,
					countryData,
					townData,
				});
			}
		);
	});

	// Second pass: process each town with proper range splitting
	const result: Towns = {};

	Object.entries(townDataByCountry).forEach(([townName, countriesData]) => {
		if (countriesData.length === 1) {
			// Single country - no splitting needed, just add country info
			const { countryData, townData } = countriesData[0];
			result[townName] = addCountryInfoToTownData(
				townData,
				townName,
				countryData
			);
		} else {
			// Multiple countries - need range splitting
			result[townName] = mergeTownDataWithRangeSplitting(
				townName,
				countriesData
			);
		}
	});

	return result;
}

/**
 * Helper to add country information to town data
 */
function addCountryInfoToTownData(
	townData: Partial<Ranges> | string,
	townName: string,
	countryData: CountryData
): Partial<Ranges> {
	const addCountryToTown = (town: Town | string): Town => {
		if (typeof town === "string") {
			return {
				county: town,
				town: townName,
				country: countryData.name,
			};
		}
		return {
			...town,
			country: town.country || countryData.name,
		};
	};

	if (typeof townData === "string") {
		return {
			"-": addCountryToTown(townData),
		};
	}

	const processed: Partial<Ranges> = {};

	Object.entries(townData).forEach(([range, value]) => {
		if (range === "names") return;

		const rangeObject = processed as Record<
			string,
			Town | Town[] | string | null
		>;
		if (typeof value === "string") {
			rangeObject[range] = addCountryToTown(value);
		} else if (Array.isArray(value)) {
			rangeObject[range] = value.map(addCountryToTown);
		} else if (value && typeof value === "object") {
			rangeObject[range] = addCountryToTown(value);
		}
	});

	if (townData.names) {
		processed.names = townData.names;
	}

	return processed;
}

/**
 * Merges town data from multiple countries with proper range splitting
 * This is the core logic that splits overlapping ranges
 */
function mergeTownDataWithRangeSplitting(
	townName: string,
	countriesData: Array<{
		countryName: string;
		countryData: CountryData;
		townData: Partial<Ranges> | string;
	}>
): Partial<Ranges> {
	// Step 1: Normalize all country data to Ranges format and collect all range keys
	const normalizedCountriesData = countriesData.map(
		({ countryName, countryData, townData }) => ({
			countryName,
			countryData,
			normalizedData: addCountryInfoToTownData(
				townData,
				townName,
				countryData
			),
		})
	);

	// Step 2: Collect all unique range keys from all countries
	const allRangeKeys = new Set<string>();
	normalizedCountriesData.forEach(({ normalizedData }) => {
		Object.keys(normalizedData).forEach((key) => {
			if (key !== "names") {
				allRangeKeys.add(key);
			}
		});
	});

	// Step 3 & 4: Use shared range splitting utility
	const rangeKeysArray = Array.from(allRangeKeys) as PrimitiveRange[];
	const rangesToValues = rangeKeysArray.map(
		(key) => [key, key] as [PrimitiveRange, string]
	);
	const splitResults = splitOverlappingRanges(rangesToValues);
	let splitRanges = splitResults.map(([range]) => range);

	// Special case: If splitRanges is empty but we have range keys,
	// it means all ranges are timeless ("-"). In this case, use the original range keys.
	if (splitRanges.length === 0 && rangeKeysArray.length > 0) {
		splitRanges = rangeKeysArray;
	}

	// Step 5: For each split range, collect data from all countries that have data for that period
	const mergedResult: Partial<Ranges> = {
		names: Array.from(
			new Set(
				normalizedCountriesData.flatMap(
					({ normalizedData }) => normalizedData.names || []
				)
			)
		),
	};

	const mergedObject = mergedResult as Record<
		string,
		Town | Town[] | string | null
	>;

	splitRanges.forEach((splitRange) => {
		const townDataForRange: Town[] = [];

		normalizedCountriesData.forEach(({ normalizedData }) => {
			// Find which original range contains this split range
			const originalRanges = Object.keys(normalizedData).filter(
				(k) => k !== "names"
			) as PrimitiveRange[];
			const rangesToValues = originalRanges.map(
				(range) => [range, range] as [PrimitiveRange, string]
			);
			const matchingRangeKeys = findMatchingRangeForSplitRange(
				splitRange,
				rangesToValues
			);

			matchingRangeKeys.forEach((matchingRangeKey) => {
				const rangeData =
					normalizedData[matchingRangeKey as keyof Ranges];
				if (rangeData) {
					const townArray = Array.isArray(rangeData)
						? rangeData
						: [rangeData];
					townDataForRange.push(...(townArray as Town[]));
				}
			});
		});

		if (townDataForRange.length > 0) {
			mergedObject[splitRange] =
				townDataForRange.length === 1
					? townDataForRange[0]
					: townDataForRange;
		}
	});

	return mergedResult;
}

// Helper functions moved to range-splitting.ts for reuse

/**
 * Check if a string is a known country name
 * Checks against all registered countries and their translations individually
 * to handle cases where multiple countries have different translations for the same country
 */
export function isCountryName(name: string): boolean {
	const lowerName = name.toLowerCase();

	// First check all names that are available from registered countries
	const registeredNames = getAllCountryNames().map((n: string) =>
		n.toLowerCase()
	);
	if (registeredNames.includes(lowerName)) {
		return true;
	}

	// Fallback: Check all raw translation files for countries that might not be registered
	const allTranslationFiles = [
		huCountries,
		deCountries,
		frCountries,
		esCountries,
		enCountries,
	];
	for (const translations of allTranslationFiles) {
		for (const [key, value] of Object.entries(translations)) {
			if (
				typeof value === "string" &&
				(key.toLowerCase() === lowerName ||
					value.toLowerCase() === lowerName)
			) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Get all registered country names (English names only)
 */
export function getRegisteredCountryNames(): string[] {
	return Array.from(countryRegistry.keys());
}

/**
 * Get country names that have detailed towns data
 * Only returns countries that have townsDetailed configured
 */
export function getCountriesWithDetailedTowns(): string[] {
	const countriesWithData: string[] = [];
	countryRegistry.forEach((data, countryName) => {
		if (data.townsDetailed) {
			countriesWithData.push(countryName);
		}
	});
	return countriesWithData;
}

/**
 * Get all country name variations (including translations, for validation)
 */
export function getAllCountryNames(): string[] {
	const names: Set<string> = new Set();

	countryRegistry.forEach((data) => {
		names.add(data.name);
		Object.keys(data.translations).forEach((key) => names.add(key));
		Object.values(data.translations).forEach((value) => names.add(value));
	});

	return Array.from(names);
}

/**
 * Search for a town name across all registered countries
 * Returns country names where the town was found
 */
export function findTownInAllCountries(townName: string): Array<{
	countryName: string;
	townData: string | Town | { county: string; map?: string; orig?: string };
}> {
	const results: Array<{
		countryName: string;
		townData:
			| string
			| Town
			| { county: string; map?: string; orig?: string };
	}> = [];

	countryRegistry.forEach((countryData, countryName) => {
		// Check in town sources
		if (countryData.townSources) {
			for (const source of countryData.townSources) {
				if (source.data[townName]) {
					results.push({
						countryName,
						townData: source.data[townName],
					});
					break; // Found in this country, no need to check other sources
				}
			}
		}

		// If not found in town sources, check in detailed towns
		if (
			results.find((r) => r.countryName === countryName) === undefined &&
			countryData.townsDetailed?.[townName]
		) {
			results.push({
				countryName,
				townData: countryData.townsDetailed[townName] as string | Town,
			});
		}
	});

	return results;
}

/**
 * Get the most likely country for a town name
 * Prioritizes countries with more complete data
 */
export function getBestCountryForTown(townName: string): string | undefined {
	const foundIn = findTownInAllCountries(townName);

	if (foundIn.length === 0) {
		return undefined;
	}

	// If only found in one country, return that
	if (foundIn.length === 1) {
		return foundIn[0].countryName;
	}

	// If found in multiple countries, prioritize based on data completeness
	// Countries with detailed towns data (like Hungary) take priority
	const withDetailedData = foundIn.filter((entry) => {
		const countryData = getCountryData(entry.countryName);
		return countryData?.townsDetailed;
	});

	if (withDetailedData.length > 0) {
		return withDetailedData[0].countryName;
	}

	// Otherwise, return the first match
	return foundIn[0].countryName;
}

/**
 * Generate all variant forms of a town name based on letter variants
 * Applies variants bidirectionally (e.g., c->cz and cz->c)
 *
 * Implementation note: This function generates simple variants by applying
 * each substitution independently to avoid exponential growth. For a word
 * with N occurrences of a pattern, it generates N variants (one per occurrence)
 * rather than 2^N combinations. This is a practical trade-off between coverage
 * and performance.
 *
 * Limitation: Overlapping variant mappings (e.g., {a: "ab", b: "c"}) are not
 * supported and will produce unpredictable results. Variant mappings should
 * be non-overlapping bidirectional pairs.
 *
 * @param townName The original town name
 * @param letterVariants The letter variant mappings
 * @returns Array of all possible variant forms including the original
 */
export function generateTownVariants(
	townName: string,
	letterVariants?: LetterVariants
): string[] {
	if (!letterVariants || Object.keys(letterVariants).length === 0) {
		return [townName];
	}

	// Build bidirectional mapping
	const bidirectionalVariants: Map<string, string> = new Map();

	Object.entries(letterVariants).forEach(([from, to]) => {
		// Forward mapping: from -> to
		bidirectionalVariants.set(from, to);
		// Reverse mapping: to -> from
		bidirectionalVariants.set(to, from);
	});

	// Generate variants by applying each substitution once
	// This prevents infinite loops while still covering all practical cases
	const variants = new Set<string>([townName]);

	// Apply each pattern substitution to the original town name
	bidirectionalVariants.forEach((replacement, pattern) => {
		// Find all occurrences of the pattern in the original town name
		let currentPos = 0;
		while (currentPos < townName.length) {
			const pos = townName.indexOf(pattern, currentPos);
			if (pos === -1) break;

			// Generate variant by replacing this occurrence
			const variant =
				townName.substring(0, pos) +
				replacement +
				townName.substring(pos + pattern.length);
			variants.add(variant);

			// Move past this occurrence to find the next one
			currentPos = pos + 1;
		}
	});

	return Array.from(variants);
}

/**
 * Get letter variants for a specific country
 */
export function getLetterVariantsForCountry(
	countryName: string
): LetterVariants | undefined {
	const data = countryRegistry.get(countryName);
	return data?.letterVariants;
}
