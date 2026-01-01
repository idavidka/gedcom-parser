import leveinstein from "js-levenshtein";

import { type Common } from "../../classes/common";
import { CommonDate } from "../../classes/date";
import { type GedComType } from "../../classes/gedcom";
import { List } from "../../classes/list";
import { type IndiKey, type Tag } from "../../types";
import type { PrimitiveRange, Range } from "../range";
import { inRange, splitRange, fromTuple } from "../range";

import { extractSeparationYears } from "../range";
import { placeCaches, getOrSetCache } from "./cache";
import {
	detectCountryName,
	getCountiesForCountry,
	getTownSourcesForCountry,
	getAllCountryTranslations,
	isCountryName,
	getBestCountryForTown,
	type CountryBasedTowns,
	convertCountryBasedToFlat,
	getCombinedDetailedTownsByCountry,
	generateTownVariants,
	getLetterVariantsForCountry,
} from "./country-registry";
import type {
	CountryBasedPureTowns,
	FlatTownValidity,
	PureRanges,
	PureTown,
	PureTowns,
	Town,
	TownData,
	Towns,
	TownValidity,
} from "./types";

/**
 * Get counties for a given country
 */
const getCounties = (
	countryName?: string
): Record<string, string> | undefined => {
	if (!countryName) {
		return undefined;
	}
	return getCountiesForCountry(countryName);
};

/**
 * Get country translations for all registered countries
 */
const _getCountryTranslations = (): Record<string, string> => {
	return getAllCountryTranslations();
};

/**
 * Create a county regexp for a specific country
 */
const createCountyRegexp = (countryName?: string): RegExp => {
	if (!countryName) {
		// Return a regexp that never matches (with global flag for matchAll)
		return /(?!.*)/g;
	}

	return getOrSetCache("countyRegexp", countryName, () => {
		const counties = getCountiesForCountry(countryName);
		if (!counties || Object.keys(counties).length === 0) {
			// Return a regexp that never matches
			return /(?!.*)/g;
		}

		return new RegExp(
			`(?<![\\p{L}])(${Object.keys(counties)
				.toSorted((a, b) => b.length - a.length)
				.join("|")})(?![\\p{L}])`,
			"giu"
		);
	});
};

/**
 * Cached wrapper for detectCountryName
 */
const cachedDetectCountryName = (name?: string): string | undefined => {
	if (!name) return undefined;
	return getOrSetCache("detectCountryName", name, () =>
		detectCountryName(name)
	);
};

/**
 * Cached wrapper for isCountryName
 */
const cachedIsCountryName = (name: string): boolean => {
	return getOrSetCache("isCountryName", name, () => isCountryName(name));
};
export const guessTown = (
	town: string,
	date?: CommonDate | number | string,
	countryName?: string,
	onlyMap = false
): undefined | { county?: string; country?: string; map?: string }[] => {
	// If no country name is provided, try to find the town in any registered country
	if (!countryName) {
		const detectedCountry = getBestCountryForTown(town);
		if (!detectedCountry) {
			return [];
		}
		countryName = detectedCountry;
	}

	// Use country-specific town sources
	const townSources = getTownSourcesForCountry(countryName);

	if (!townSources || townSources.length === 0) {
		return [];
	}

	// Cache the sorted sources per country to avoid re-sorting
	const sourcesToUse = getOrSetCache("sortedTownSources", countryName, () => {
		return townSources.toSorted((a, b) => {
			if (!b._year && !a._year) {
				return 0;
			} else if (!b._year) {
				return 1;
			} else if (!a._year) {
				return -1;
			}
			return (b._year ?? 0) - (a._year ?? 0);
		});
	});

	// Get letter variants for this country
	const letterVariants = getLetterVariantsForCountry(countryName);

	// Generate all variant forms of the town name (cached)
	const townVariants = getOrSetCache(
		"townVariants",
		`${countryName}:${town}`,
		() => generateTownVariants(town, letterVariants)
	);

	const year =
		date instanceof CommonDate
			? date?.YEAR
			: date
				? { value: date }
				: undefined;
	const numberYear = Number(year?.value);

	// Search for the town using all variants
	let foundSource: (typeof sourcesToUse)[number] | undefined;
	let matchedTownName: string | undefined;

	for (const variant of townVariants) {
		foundSource = sourcesToUse.find((s) => {
			if (isNaN(numberYear) && s.data[variant as keyof typeof s.data]) {
				return true;
			}

			if (
				!isNaN(numberYear) &&
				s._year &&
				numberYear <= s._year &&
				s.data[variant as keyof typeof s.data]
			) {
				return true;
			}
			return false;
		});

		if (foundSource) {
			matchedTownName = variant;
			break;
		}
	}

	// Fallback to first source if no match found
	if (!foundSource) {
		foundSource = sourcesToUse[0];
	}

	// Create cache key based on town, country, onlyMap, and the source's _year (which dataset is being used)
	const sourceYear = foundSource?._year ?? "no-year";
	const cacheKey = `${town}|${countryName}|${onlyMap ? "1" : "0"}|${sourceYear}`;

	// Return cached result if available
	const cached = placeCaches.guessTown[cacheKey];
	if (cached !== undefined) {
		return cached;
	}

	// Use the matched town name if found, otherwise use the original
	const lookupTown = matchedTownName || town;
	const guessing =
		foundSource?.data[lookupTown as keyof typeof foundSource.data];
	const guessed = Array.isArray(guessing)
		? guessing
		: guessing
			? [guessing]
			: [];

	// Get country-specific data for validation
	const counties = getCounties(countryName);

	if (
		!guessed?.length &&
		counties &&
		!townVariants.some((v) => counties[v as keyof typeof counties]) &&
		!cachedIsCountryName(town)
	) {
		placeCaches.guessTown[cacheKey] = [];
		return [];
	}

	const result =
		guessed?.map((g) =>
			onlyMap
				? { map: g.map } // TODO esetleg tobb terkep gombot is megjeleniteni possible town name alapjan?
				: {
						...g,
						country: g.country || countryName,
					}
		) || [];

	// Cache the result before returning
	placeCaches.guessTown[cacheKey] = result;
	return result;
};

const commonMistakesKey = ["Pilies", "ue", "oe", "ae", "Szatmar", "Kis-Kun"];

export const isSame = (
	townValidity?: FlatTownValidity,
	checkSuggested = false
) => {
	const suggestedSame =
		townValidity?.suggestedTown &&
		townValidity.suggestedTown === townValidity.invalidTown &&
		townValidity.suggestedCounty === townValidity.invalidCounty &&
		townValidity.suggestedCountry === townValidity.invalidCountry;
	return (
		(townValidity &&
			townValidity.invalidTown === townValidity.validTown &&
			townValidity.invalidCounty === townValidity.validCounty &&
			townValidity.invalidCountry === townValidity.validCountry) ||
		(checkSuggested && suggestedSame)
	);
};

export const isWarning = (error?: string) =>
	error && ["Not found", "No date set"].includes(error);

export const isNotFound = (error?: string) => error === "Not found";

export const includesLowerCase = (
	haystack?: string | string[],
	needle?: string | string[]
) => {
	if (haystack === undefined || needle === undefined) {
		return false;
	}

	if (typeof haystack === "string" && typeof needle === "string") {
		return haystack.toLowerCase() === needle.toLowerCase();
	}

	if (typeof haystack === "string" && Array.isArray(needle)) {
		return needle.some((n) => n.toLowerCase() === haystack.toLowerCase());
	}

	if (Array.isArray(haystack) && typeof needle === "string") {
		return haystack.some((h) => h.toLowerCase() === needle.toLowerCase());
	}

	if (Array.isArray(haystack) && Array.isArray(needle)) {
		return needle.some((n) =>
			haystack.some((h) => h.toLowerCase() === n.toLowerCase())
		);
	}

	return false;
};

const parsedTownsCache: Record<
	string,
	{
		config?: PureTowns;
		county: Record<string, Town[] | undefined>;
		town: Record<string, string[] | undefined>;
		current: Record<
			string,
			Array<ReturnType<typeof getPlaceParts>[number]> | undefined
		>;
	}
> = {};

const getCache = (townsData?: Towns | CountryBasedTowns) => {
	const cacheKey = JSON.stringify(townsData);

	if (!parsedTownsCache[cacheKey]) {
		parsedTownsCache[cacheKey] = {
			county: {},
			town: {},
			current: {},
		};
	}

	return parsedTownsCache[cacheKey];
};

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
const ensureArray = <T>(x: T | T[] | undefined): T[] =>
	x === undefined ? [] : Array.isArray(x) ? x : [x];

const mapRangeDataToPure = (
	rangeTown: Town | string,
	currentKey: string
): PureTown => {
	if (typeof rangeTown === "string") {
		return { county: rangeTown, town: [currentKey] };
	}
	const { county, country, leftParts, town } = rangeTown;
	return deepClone({
		county,
		country,
		leftParts,
		town: Array.isArray(town) ? town : [town],
	});
};

const addNameAliases = (main: PureTowns, key: string, names?: string[]) => {
	names?.forEach((alias) => {
		if (!main[alias]) {
			main[alias] = deepClone(main[key]);
		}
	});
};

// Child → parent assimilation start year: only consider child ranges where
// the child's town array includes the parent AND leftParts is present (assimilation/merger).
// Child → parent separation points: collect all years where children separate from parent
const getSeparationYears = (
	childName: string,
	child: Partial<PureRanges> | undefined,
	parentName: string
): number[] => {
	if (!child) {
		return [];
	}

	// Filter out undefined values to match expected type
	const filteredChild = Object.fromEntries(
		Object.entries(child).filter(([, value]) => value !== undefined)
	) as Record<string, unknown[]>;

	// Use shared range splitting utility
	return extractSeparationYears(
		childName,
		filteredChild,
		parentName,
		ensureArray
	);
};

//

//  Splitting the parent's periods to show child separations: at each separation year,
// we split the range and update which children are included in each segment.
// Parent's county/country are preserved from the original input ranges.
const applyChildSeparationsToParent = (
	parent: Partial<PureRanges>,
	childSeparations: Map<string, number[]>,
	childInfo: Map<
		string,
		{
			isPartOfParentAt: (year: number | undefined) => boolean;
			separationYears: number[];
		}
	>
): Partial<PureRanges> => {
	const result: Partial<PureRanges> = {};

	// Collect all separation years across all children
	const allSeparationYears = new Set<number>();
	childSeparations.forEach((years) => {
		years.forEach((year) => allSeparationYears.add(year));
	});

	if (allSeparationYears.size === 0) {
		// No separations, but still need to add children to the parent's town list
		Object.entries(parent).forEach(([rangeKey, entries]) => {
			if (rangeKey === "names" || !entries) {
				return;
			}
			const pts = entries as PureTown[];
			const [rangeStart, rangeEnd] = (rangeKey as PrimitiveRange)
				.split("-")
				.map((s) => (s ? Number(s) : undefined));

			const segmentEntries = pts.map((orig) => {
				const towns = ensureArray(orig.town).slice();

				// Add children that were part of parent during the mid-point of this range
				const midYear =
					rangeStart !== undefined && rangeEnd !== undefined
						? Math.floor((rangeStart + rangeEnd) / 2)
						: (rangeStart ?? rangeEnd);

				childInfo.forEach((info, childName) => {
					if (info.isPartOfParentAt(midYear)) {
						if (!towns.includes(childName)) {
							towns.push(childName);
						}
					}
				});

				const copy = deepClone(orig);
				copy.town = towns;
				// Keep parent's original county/country - DO NOT inherit from children
				return copy;
			});

			result[rangeKey as PrimitiveRange] = segmentEntries;
		});
		result.names = deepClone(parent.names ?? []);
		return result;
	}

	const sortedSeparationYears = Array.from(allSeparationYears).sort(
		(a, b) => a - b
	);

	Object.entries(parent).forEach(([rangeKey, entries]) => {
		if (rangeKey === "names" || !entries) {
			return;
		}
		const pts = entries as PureTown[];

		// For each separation year that falls within this range, we need to split
		const range = rangeKey as PrimitiveRange;
		const [rangeStart, rangeEnd] = range
			.split("-")
			.map((s) => (s ? Number(s) : undefined));

		let currentStart = rangeStart;

		// Find separation years that fall within this range
		const relevantSeparations = sortedSeparationYears.filter((year) => {
			const afterStart =
				currentStart === undefined || year > currentStart;
			const beforeEnd = rangeEnd === undefined || year <= rangeEnd;
			return afterStart && beforeEnd;
		});

		// If no separations in this range, just process the whole range
		if (relevantSeparations.length === 0) {
			const newRange = fromTuple(currentStart, rangeEnd);
			if (!result[newRange]) result[newRange] = [];

			const segmentEntries = pts.map((orig) => {
				const towns = ensureArray(orig.town).slice();

				// Add children that were part of parent during the mid-point of this range
				const midYear =
					currentStart !== undefined && rangeEnd !== undefined
						? Math.floor((currentStart + rangeEnd) / 2)
						: (currentStart ?? rangeEnd);

				childInfo.forEach((info, childName) => {
					if (info.isPartOfParentAt(midYear)) {
						if (!towns.includes(childName)) {
							towns.push(childName);
						}
					}
				});

				const copy = deepClone(orig);
				copy.town = towns;
				// Keep parent's original county/country - DO NOT inherit from children
				return copy;
			});

			(result[newRange] as PureTown[]).push(...segmentEntries);
			return;
		}

		// Process segments between separation years
		for (let i = 0; i <= relevantSeparations.length; i++) {
			// For the last segment (i == relevantSeparations.length), use rangeEnd
			// For other segments, end at (separationYear - 1)
			let segmentEnd: number | undefined;
			if (i < relevantSeparations.length) {
				// All separations: end before the separation year
				segmentEnd = relevantSeparations[i] - 1;
			} else {
				segmentEnd = rangeEnd;
			}

			const segmentRange = fromTuple(currentStart, segmentEnd);

			// For this segment, determine which children should be included
			// eslint-disable-next-line no-loop-func
			const segmentEntries = pts.map((orig) => {
				const towns = ensureArray(orig.town).slice();

				// Add children that were part of parent during the mid-point of this segment
				const midYear =
					currentStart !== undefined && segmentEnd !== undefined
						? Math.floor((currentStart + segmentEnd) / 2)
						: (currentStart ?? segmentEnd);

				childInfo.forEach((info, childName) => {
					if (info.isPartOfParentAt(midYear)) {
						if (!towns.includes(childName)) {
							towns.push(childName);
						}
					}
				});

				const copy = deepClone(orig);
				copy.town = towns;
				// Keep parent's original county/country - DO NOT inherit from children
				return copy;
			});

			if (!result[segmentRange]) result[segmentRange] = [];
			(result[segmentRange] as PureTown[]).push(...segmentEntries);

			// Move to next segment
			if (i < relevantSeparations.length) {
				currentStart = relevantSeparations[i];
			}
		}
	});

	result.names = deepClone(parent.names ?? []);
	return result;
};

const _getAssimilationStart = (
	child: Partial<PureRanges> | undefined,
	parentName: string
): number | undefined => {
	if (!child) {
		return;
	}
	let minStart: number | undefined;

	Object.entries(child).forEach(([rangeKey, entries]) => {
		if (rangeKey === "names" || !entries) {
			return;
		}
		const pts = entries as PureTown[];

		// only with assimilation marker (leftParts) and if it actually belongs under the parent
		const belongsWithAssimilation = pts.some(
			(pt) =>
				pt.leftParts?.length &&
				ensureArray(pt.town).includes(parentName)
		);
		if (!belongsWithAssimilation) {
			return;
		}

		// only consider ranges that start with a number as cut-start (e.g., "1940-")
		const split = (rangeKey as PrimitiveRange).split("-");
		const start = split[0] ? Number(split[0]) : undefined;
		if (
			typeof start === "number" &&
			(minStart === undefined || start < minStart)
		) {
			minStart = start;
		}
	});

	return minStart;
};

// Splitting the parent's periods: up to cutYear-1 we add the child's name;
// afterwards we remove it. Other town names are not modified.
const _applyAssimilationToParent = (
	parent: Partial<PureRanges>,
	childName: string,
	cutYear: number
): Partial<PureRanges> => {
	const result: Partial<PureRanges> = {
		names: deepClone(parent.names ?? []),
	};
	const earlyRange: Range = [undefined, cutYear - 1];

	Object.entries(parent).forEach(([rangeKey, entries]) => {
		if (rangeKey === "names" || !entries) {
			return;
		}
		const pts = entries as PureTown[];

		const segments = splitRange(rangeKey as PrimitiveRange, earlyRange);
		segments.forEach((seg) => {
			const segEntries = pts.map((orig) => {
				const towns = ensureArray(orig.town).slice();
				if (seg.by) {
					if (!towns.includes(childName)) towns.push(childName);
				} else {
					const i = towns.indexOf(childName);
					if (i >= 0) towns.splice(i, 1);
				}
				const copy = deepClone(orig);
				copy.town = towns;
				return copy;
			});

			if (!result[seg.range]) result[seg.range] = [];
			(result[seg.range] as PureTown[]).push(...segEntries);
		});
	});

	return result;
};

// Building the child from the parent: every parent range is transferred.
// If the parent's given range includes the child name, the child's town becomes [childName],
// otherwise the original parent town remains.
const buildChildFromParent = (
	parent: Partial<PureRanges>,
	childName: string
): Partial<PureRanges> => {
	const child: Partial<PureRanges> = { names: [] };
	Object.entries(parent).forEach(([rangeKey, entries]) => {
		if (rangeKey === "names" || !entries) {
			return;
		}
		const pts = entries as PureTown[];
		const mapped = pts.map((e) => {
			const towns = ensureArray(e.town);
			const copy = deepClone(e);
			copy.town = towns.includes(childName) ? [childName] : towns.slice();
			return copy;
		});
		(child[rangeKey as PrimitiveRange] as PureTown[] | undefined) = mapped;
	});
	return child;
};

// If a parent range points to a single target (and there is no leftParts), it's a rename:
// add the parent's name to child.names, BUT only if the child is not explicit in towns.json.
// In this case also add the parent's own name to parent.names (e.g., "Pentele").
const maybeInheritNameFromRename = (
	parentName: string,
	rangeEntry: PureTown,
	targetName: string,
	main: PureTowns,
	explicitKeys: Set<string>
) => {
	const isSingleTarget =
		!rangeEntry.leftParts && ensureArray(rangeEntry.town).length === 1;
	if (!isSingleTarget) {
		return;
	}

	const child = main[targetName];
	if (!child) {
		return;
	}

	// only inherit names for non-explicit children (to match the export)
	if (explicitKeys.has(targetName)) {
		return;
	}

	const childNames = (child.names ?? []) as string[];
	if (!childNames.includes(parentName)) {
		child.names = [...childNames, parentName];
	}

	// a szülő saját names-ébe is írjuk a nevét (pl. "Pentele")
	const parent = main[parentName];
	if (parent) {
		const pn = (parent.names ?? []) as string[];
		if (!pn.includes(parentName)) {
			parent.names = [...pn, parentName];
		}
	}
};

export const parseTowns = (
	townsData?: Towns | CountryBasedTowns
): PureTowns | CountryBasedPureTowns => {
	// Default to fallback data if nothing provided - use getCombinedDetailedTownsByCountry
	// to get country-based data from all registered countries
	const usedTownsData = townsData || getCombinedDetailedTownsByCountry();
	if (!usedTownsData) return {};

	// Check if the input is country-based by looking for country names as keys
	// A country-based structure has country names (like "Hungary", "Austria") as top-level keys
	// A flat Towns structure has town names as top-level keys
	const keys = Object.keys(usedTownsData);

	// Check if ALL top-level keys are country names and their values are objects (Towns)
	// This distinguishes between:
	// - Country-based: { "Hungary": { towns... }, "Austria": { towns... } }
	// - Flat Towns: { "TownName": { ranges... }, "AnotherTown": { ranges... } }
	const isCountryBased =
		keys.length > 0 &&
		keys.every((key) => {
			// Check if key is a known country name
			if (!isCountryName(key)) return false;

			// Check if value is an object (Towns structure, not a string county)
			const value = usedTownsData[key];
			if (
				typeof value !== "object" ||
				value === null ||
				Array.isArray(value)
			) {
				return false;
			}

			// Check that it's not a Ranges object (which would have range keys like "-1600" or "names")
			const valueKeys = Object.keys(value);
			const hasRangeKeys = valueKeys.some(
				(k) => k === "names" || /^-?\d*-\d*$/.test(k)
			);

			// If it has range keys, it's a town's Ranges object, not a country's Towns object
			return !hasRangeKeys;
		});

	if (isCountryBased) {
		// Process each country separately
		const result: CountryBasedPureTowns = {};
		Object.entries(usedTownsData as CountryBasedTowns).forEach(
			([country, countryTowns]) => {
				result[country] = parseTownsFlat(countryTowns);
			}
		);
		return result;
	}

	// Process as flat Towns structure
	return parseTownsFlat(usedTownsData as Towns);
};

// Helper function to parse flat Towns structure (original parseTowns logic)
const parseTownsFlat = (townsData?: Towns): PureTowns => {
	// Use getCombinedDetailedTownsByCountry and convert to flat if no data provided
	const usedTownsData =
		townsData ||
		convertCountryBasedToFlat(getCombinedDetailedTownsByCountry());
	if (!usedTownsData) return {};

	const cache = getCache(townsData);
	if (cache.config) return cache.config;

	const mainTowns: PureTowns = {};
	const explicitKeys = new Set(Object.keys(usedTownsData));

	// 1) Initial population into PureTowns. Preserve the names from towns.json.
	Object.entries(usedTownsData).forEach(([town, data]) => {
		if (typeof data === "string") {
			mainTowns[town] = {
				"-": [{ county: data, town: [town] }],
				names: [],
			};
			return;
		}

		const pure: Partial<PureRanges> = {};
		const savedNames = data.names ?? [];
		Object.entries(data).forEach(([rangeKey, rangeData]) => {
			if (rangeKey === "names" || !rangeData) {
				return;
			}
			const arr = Array.isArray(rangeData) ? rangeData : [rangeData];
			(pure[rangeKey as PrimitiveRange] as PureTown[]) = arr.map((r) =>
				mapRangeDataToPure(r as Town | string, town)
			);
		});
		pure.names = savedNames;

		mainTowns[town] = pure;

		// add alias keys with deep copy
		addNameAliases(mainTowns, town, pure.names);
	});

	// 2/a) Add missing child keys based on ALL parent ranges.
	// The child receives every parent range (see above), then handle name inheritance.
	Object.entries(mainTowns).forEach(([parentName, parentData]) => {
		Object.entries(parentData).forEach(([rangeKey, entries]) => {
			if (rangeKey === "names" || !entries) {
				return;
			}
			const pts = entries as PureTown[];

			const childNames = pts
				.flatMap((pt) => ensureArray(pt.town))
				.filter((t): t is string =>
					Boolean(typeof t === "string" && t && t !== parentName)
				);

			childNames.forEach((childName) => {
				if (!mainTowns[childName]) {
					mainTowns[childName] = buildChildFromParent(
						parentData,
						childName
					);
				}
			});

			// name inheritance only in case of "rename" and only for non-explicit children
			pts.forEach((pt) => {
				const targets = ensureArray(pt.town);
				if (targets.length === 1) {
					const targetName = targets[0]!;
					if (targetName && targetName !== parentName) {
						maybeInheritNameFromRename(
							parentName,
							pt,
							targetName,
							mainTowns,
							explicitKeys
						);
					}
				}
			});
		});
	});

	// 2/b) Range inheritance for children that didn't exist before (first range points to parent)
	// For explicit children with a first range (-YEAR) pointing to a parent,
	// inherit all parent ranges that existed before the child's separation year.
	// This replaces the single first range with multiple ranges showing different counties over time.
	Object.keys(mainTowns).forEach((childName) => {
		if (!explicitKeys.has(childName)) {
			return;
		}
		const child = mainTowns[childName];
		if (!child) {
			return;
		}

		// Find first ranges where child points to a parent (child didn't exist before)
		const rangesToReplace: {
			oldRange: PrimitiveRange;
			parentName: string;
			separationYear: number;
		}[] = [];

		Object.entries(child).forEach(([rangeKey, entries]) => {
			if (rangeKey === "names" || !entries) {
				return;
			}
			const pts = entries as PureTown[];

			// Check if this is a first range (-YEAR) pointing to a single parent
			const isFirstRange = (rangeKey as string).match(/^-\d+$/);
			if (!isFirstRange) {
				return;
			}

			pts.forEach((pt) => {
				const towns = ensureArray(pt.town);
				const keyDiffersFromTown = !towns.includes(childName);
				const isSingleParent = towns.length === 1;

				if (keyDiffersFromTown && isSingleParent) {
					const parentName = towns[0];
					if (!parentName || parentName === childName) {
						return;
					}

					const parent = mainTowns[parentName];
					if (!parent) {
						return;
					}

					// Extract the separation year from the range (-YEAR)
					const [, endStr] = (rangeKey as string).split("-");
					const separationYear = endStr
						? Number(endStr) + 1
						: undefined;

					if (!separationYear) {
						return;
					}

					rangesToReplace.push({
						oldRange: rangeKey as PrimitiveRange,
						parentName,
						separationYear,
					});
				}
			});
		});

		// Now replace the old first ranges with inherited parent ranges
		rangesToReplace.forEach(({ oldRange, parentName, separationYear }) => {
			const parent = mainTowns[parentName];
			if (!parent) {
				return;
			}

			// Remove the old first range that will be replaced
			delete child[oldRange];

			// Add parent ranges that existed before separation
			Object.entries(parent).forEach(
				([parentRangeKey, parentEntries]) => {
					if (parentRangeKey === "names" || !parentEntries) {
						return;
					}

					const [parentStart, parentEnd] = (parentRangeKey as string)
						.split("-")
						.map((s) => (s ? Number(s) : undefined));

					// Skip ranges that start at or after the separation year
					// (child was already independent by then)
					if (
						parentStart !== undefined &&
						parentStart >= separationYear
					) {
						return;
					}

					// Only inherit ranges where the parent range existed during the child's "was part of" period
					const parentRangeEndsBefore =
						parentEnd === undefined || parentEnd < separationYear;

					if (parentRangeEndsBefore) {
						// For ranges that end before separation, use the parent range as-is
						const parentPts = parentEntries as PureTown[];
						child[parentRangeKey as PrimitiveRange] = parentPts.map(
							(e) => {
								const copy = deepClone(e);
								// Keep parent's town name to indicate child was part of parent
								return copy;
							}
						);
					} else {
						// Parent range overlaps with child's separation - need to split
						// Create a range from parent start to separation-1
						const newRangeKey = fromTuple(
							parentStart,
							separationYear - 1
						);
						const parentPts = parentEntries as PureTown[];
						child[newRangeKey] = parentPts.map((e) => {
							const copy = deepClone(e);
							// Keep parent's town name to indicate child was part of parent
							return copy;
						});
					}
				}
			);
		});
	});

	// 2/c) Assimilation: only an explicit child (top-level key in towns.json) can cause cutting,
	// and only if, for the child, the parent's presence is indicated by the child key differing from town values.
	// Process each parent once, collecting all children and their separation years.
	const parentsToProcess = new Set<string>();

	// First, identify all parents that have children pointing to them
	Object.keys(mainTowns).forEach((childName) => {
		if (!explicitKeys.has(childName)) {
			return;
		}
		const child = mainTowns[childName];
		if (!child) {
			return;
		}

		// Find parents this child points to (both "was part of" and "will be assimilated")
		Object.entries(child).forEach(([rangeKey, entries]) => {
			if (rangeKey === "names" || !entries) {
				return;
			}
			(entries as PureTown[]).forEach((pt) => {
				const towns = ensureArray(pt.town);
				const keyDiffersFromTown = !towns.includes(childName);
				// Process both "was part of" (no leftParts) and "will be assimilated" (has leftParts)
				// BUT ONLY if the town array has EXACTLY ONE entry (indicating a single parent)
				// If there are multiple towns, it's a merger/composition, not a parent-child relationship
				if (keyDiffersFromTown && towns.length === 1) {
					const maybeParent = towns[0];
					if (maybeParent && maybeParent !== childName) {
						parentsToProcess.add(maybeParent);
					}
				}
			});
		});
	});

	// Now process each parent once (only explicit keys)
	parentsToProcess.forEach((parentName) => {
		// Only process parents that are explicit keys in the source data
		if (!explicitKeys.has(parentName)) {
			return;
		}

		const parent = mainTowns[parentName];
		if (!parent) {
			return;
		}

		// Collect all children of this parent and when they were part of the parent
		type ChildPointInfo = {
			isPartOfParentAt: (year: number | undefined) => boolean;
			separationYears: number[];
		};
		const childInfo = new Map<string, ChildPointInfo>();

		Object.keys(mainTowns).forEach((childName) => {
			if (!explicitKeys.has(childName)) {
				return;
			}
			const child = mainTowns[childName];
			if (!child) {
				return;
			}

			// Find ranges where this child pointed to the parent
			const pointsToParentInRanges: PrimitiveRange[] = [];
			const assimilatedIntoParentInRanges: PrimitiveRange[] = [];
			const intermediateRanges: PrimitiveRange[] = [];

			// Track all "was part of" ranges (where child points to parent)
			// to find the latest one for determining actual separation year
			const wasPartOfRanges: Array<{
				range: PrimitiveRange;
				end: number | undefined;
			}> = [];

			Object.entries(child).forEach(([rangeKey, entries]) => {
				if (rangeKey === "names" || !entries) {
					return;
				}
				const pts = entries as PureTown[];

				pts.forEach((pt) => {
					const towns = ensureArray(pt.town);
					const keyDiffersFromTown = !towns.includes(childName);
					const pointsToParent = towns.includes(parentName);
					// Only consider it a parent-child relationship if town array has EXACTLY ONE entry
					// Multiple entries indicate a merger/composition, not a parent-child relationship
					const isSingleParent = towns.length === 1;

					if (
						keyDiffersFromTown &&
						pointsToParent &&
						isSingleParent
					) {
						const isLastRange = (rangeKey as string).match(
							/^\d+-$/
						);

						if (isLastRange) {
							// Child WILL BE assimilated into parent starting from this range
							assimilatedIntoParentInRanges.push(
								rangeKey as PrimitiveRange
							);
						} else if (pt.leftParts && pt.leftParts.length > 0) {
							// Intermediate range with leftParts means temporary naming
							intermediateRanges.push(rangeKey as PrimitiveRange);
						} else {
							// This is a "was part of" range (child didn't exist independently)
							// Could be -XXXX or XXXX-YYYY format
							const [, endStr] = (rangeKey as string).split("-");
							const end = endStr ? Number(endStr) : undefined;
							wasPartOfRanges.push({
								range: rangeKey as PrimitiveRange,
								end,
							});
						}
					}
				});
			});

			// Find the "was part of" range with the latest end year
			// This determines when the child actually became independent
			if (wasPartOfRanges.length > 0) {
				let latestRange:
					| { range: PrimitiveRange; end: number | undefined }
					| undefined;

				wasPartOfRanges.forEach((item) => {
					if (item.end !== undefined) {
						if (
							!latestRange ||
							latestRange.end === undefined ||
							item.end > latestRange.end
						) {
							latestRange = item;
						}
					} else if (!latestRange) {
						latestRange = item;
					}
				});

				if (latestRange) {
					pointsToParentInRanges.push(latestRange.range);
				}
			}

			if (
				pointsToParentInRanges.length > 0 ||
				assimilatedIntoParentInRanges.length > 0 ||
				intermediateRanges.length > 0
			) {
				const separationYears = getSeparationYears(
					childName,
					child,
					parentName
				);

				// Find the assimilation year (start of the first assimilation range)
				// This is the year when the child stops being independent/part of THIS parent
				// and becomes part of ANOTHER parent
				let assimilationYear: number | undefined;

				// Check if child has ANY last range that points to a different parent
				Object.entries(child).forEach(([rangeKey, entries]) => {
					if (rangeKey === "names" || !entries) return;
					const pts = entries as PureTown[];
					const isLastRange = (rangeKey as string).match(/^\d+-$/);

					if (isLastRange) {
						pts.forEach((pt) => {
							const towns = ensureArray(pt.town);
							const keyDiffersFromTown =
								!towns.includes(childName);
							const isSingleParent = towns.length === 1;
							const pointsToAnyParent = towns.some((t) =>
								explicitKeys.has(t)
							);

							if (
								keyDiffersFromTown &&
								isSingleParent &&
								pointsToAnyParent
							) {
								// Child is assimilated into some parent at this year
								const [start] = (rangeKey as string)
									.split("-")
									.map((x) => (x ? Number(x) : undefined));
								if (
									start !== undefined &&
									(assimilationYear === undefined ||
										start < assimilationYear)
								) {
									assimilationYear = start;
								}
							}
						});
					}
				});

				// Create a function to check if child was part of parent at a given year
				const isPartOfParentAt = (year: number | undefined) => {
					// Case 1: Intermediate ranges - child should NOT appear in parent during these ranges
					// Intermediate ranges mean the child was temporarily NAMED the parent (e.g., Verőce->Verőcemaros 1975-1989)
					// The parent should show only its own name during these periods, not the child components
					if (intermediateRanges.length > 0) {
						// For intermediate ranges, NEVER add the child to the parent
						return false;
					}

					// Case 2: First range - Child WAS part of parent UNTIL end of range, separated AFTER
					const wasPartOfParent = pointsToParentInRanges.some((r) => {
						const [start, end] = r
							.split("-")
							.map((x) => (x ? Number(x) : undefined));
						if (year === undefined) {
							return start === undefined && end === undefined;
						}
						// For any "was part of" range (first or bounded), child should appear AFTER the end year
						// This is when the child became independent
						if (end !== undefined) {
							const afterEnd = year > end;
							const beforeAssimilation =
								assimilationYear === undefined ||
								year < assimilationYear;
							return afterEnd && beforeAssimilation;
						}
						// Open-ended range (shouldn't happen for "was part of", but handle it)
						return false;
					});

					if (wasPartOfParent) return true;

					// Case 3: Last range - Child WILL BE assimilated (show before assimilation year, but only if child is independent)
					if (assimilationYear !== undefined) {
						if (year === undefined) {
							// For open-ended ranges, child is not part of parent
							return false;
						}
						// Child should be shown in parent BEFORE assimilation, but only if independent
						if (year >= assimilationYear) {
							return false; // After or at assimilation, not shown
						}

						// Check if child is independent at this year (not part of another parent)
						// A child is independent if it has a range where its key equals its town value
						const isIndependent = Object.entries(child).some(
							([rangeKey, entries]) => {
								if (rangeKey === "names" || !entries) {
									return false;
								}
								const pts = entries as PureTown[];
								const [start, end] = (
									rangeKey as PrimitiveRange
								)
									.split("-")
									.map((x) => (x ? Number(x) : undefined));

								// Check if year falls in this range
								const inRange =
									year === undefined
										? start === undefined &&
											end === undefined
										: (start === undefined ||
												year >= start) &&
											(end === undefined || year <= end);

								if (!inRange) return false;

								// Check if child's key matches its town value in this range (indicating independence)
								return pts.some((pt) => {
									const towns = ensureArray(pt.town);
									return towns.includes(childName);
								});
							}
						);

						return isIndependent;
					}

					return false;
				};

				childInfo.set(childName, {
					isPartOfParentAt,
					separationYears,
				});
			}
		});

		if (childInfo.size > 0) {
			// Collect all separation years
			const childSeparations = new Map<string, number[]>();
			childInfo.forEach((info, childName) => {
				if (info.separationYears.length > 0) {
					childSeparations.set(childName, info.separationYears);
				}
			});

			mainTowns[parentName] = applyChildSeparationsToParent(
				parent,
				childSeparations,
				childInfo
			);
		}
	});

	cache.config = mainTowns;
	return cache.config;
};

// const HungarianTownsCountiesValidator = parseTowns(
// 	townsFallbackData as unknown as Towns
// );

export const getTownNames = (
	town: string,
	usedTownConfig?: Towns | CountryBasedTowns
) => {
	const cache = getCache(usedTownConfig);
	if (cache.town[town]?.length) {
		return cache.town[town];
	}

	const parsed = parseTowns(usedTownConfig);
	let townRanges: Partial<PureRanges> | undefined;

	// Check if result is country-based
	const firstKey = Object.keys(parsed)[0];
	if (
		firstKey &&
		typeof parsed[firstKey] === "object" &&
		!Array.isArray(parsed[firstKey])
	) {
		const potentialCountryData = parsed[firstKey] as Record<
			string,
			unknown
		>;
		// Check if this looks like country-based (has town entries)
		if (
			Object.keys(potentialCountryData).some(
				(k) =>
					k !== "names" && typeof potentialCountryData[k] === "object"
			)
		) {
			// It's country-based - search all countries for the town
			const countryBased = parsed as CountryBasedPureTowns;
			for (const countryTowns of Object.values(countryBased)) {
				if (countryTowns[town]) {
					townRanges = countryTowns[town];
					break;
				}
			}
		} else {
			// It's flat
			townRanges = (parsed as PureTowns)[town];
		}
	} else {
		// It's flat
		townRanges = (parsed as PureTowns)[town];
	}

	if (!townRanges || typeof townRanges === "string") {
		cache.town[town] = [town];
	} else {
		const names: Record<string, boolean | undefined> = { [town]: true };

		Object.entries(townRanges).forEach(([_range, townName]) => {
			if (!townName) {
				return;
			}

			townName.forEach((name) => {
				if (typeof name === "string") {
					names[name] = true;
				} else {
					if (Array.isArray(name.town)) {
						name.town.forEach((n) => {
							names[n] = true;
						});
					} else {
						names[name.town] = true;
					}
				}
			});
		});

		cache.town[town] = Object.keys(names);
	}
	return cache.town[town];
};

export const getPlaceParts = (place: string | (string | undefined)[] = []) => {
	const partsString = Array.isArray(place)
		? place.filter(Boolean).join(", ")
		: place;

	// Check cache first
	const cached = placeCaches.placeParts[partsString];
	if (cached) {
		return cached;
	}

	// First pass: try to detect country from the last part to use country-specific county regexp
	const initialParts = partsString.split(/,\s*/).map((p) => p.trim());
	const potentialCountry = initialParts[initialParts.length - 1];
	const detectedCountryName = potentialCountry
		? cachedDetectCountryName(potentialCountry)
		: undefined;

	// Use country-specific county regexp if available
	const countyRegexp = detectedCountryName
		? createCountyRegexp(detectedCountryName)
		: /(?!.*)/g; // Regexp that never matches if no country detected (with global flag for matchAll)
	const countyParts = Array.from(partsString.matchAll(countyRegexp));
	const countyPart = countyParts[countyParts.length - 1];

	let parts: string[] = [];
	if (countyPart?.[1]) {
		const start = countyPart.index;
		const end = start + countyPart[1].length;
		const replacement = countyPart[1].replace(/,/g, "#!#");

		parts = (
			partsString.slice(0, start) +
			replacement +
			partsString.slice(end)
		).split(/,\s*/);
	} else {
		parts = partsString.split(/,\s*/);
	}

	parts = parts.map((p) => p.trim().replace(/#!#/g, ","));

	// Detect if the place is in country-to-city format (country comes first)
	// Check if the first part is a known country using the country registry
	const firstPartIsCountry =
		parts.length > 0 && cachedIsCountryName(parts[0]);

	// If first part is a country, reverse the parts to normalize to city-to-country format
	if (firstPartIsCountry && parts.length >= 2) {
		parts = parts.toReversed();
	}

	let country: string | undefined;
	let county: string | undefined;
	let town: string | undefined;
	let guessedTown:
		| {
				county?: string;
				country?: string;
				map?: string;
		  }[]
		| undefined;

	if (parts.length >= 3) {
		country = parts[parts.length - 1];
		county = parts[parts.length - 2];
		town = parts[parts.length - 3];

		// Validate that town is not a registered country name
		if (town && cachedIsCountryName(town)) {
			// If town is actually a registered country, this is malformed data
			// Treat it as if we only have 1 part (just the country)
			country = town;
			county = undefined;
			town = undefined;
		}

		// Normalize country name to English
		if (country && cachedIsCountryName(country)) {
			country = cachedDetectCountryName(country);
		}
	} else if (parts.length === 2) {
		// Detect country name for county lookup
		const countryNameForLookup = parts.find((p) => cachedIsCountryName(p))
			? cachedDetectCountryName(parts.find((p) => cachedIsCountryName(p)))
			: detectedCountryName;
		const counties = getCounties(countryNameForLookup);

		parts.toReversed().forEach((p) => {
			if (cachedIsCountryName(p)) {
				country = p;
			} else if (counties?.[p as keyof typeof counties]) {
				county = p;
			} else {
				town = p;
			}
		});

		// Normalize country name to English
		if (country && cachedIsCountryName(country)) {
			country = cachedDetectCountryName(country);
		}
	} else if (parts.length === 1) {
		// Try to guess the town with detected country context
		// Use normalized country name (same logic as parts.length === 2 case)
		const countryNameForLookup =
			cachedDetectCountryName(detectedCountryName);
		guessedTown = guessTown(parts[0], undefined, countryNameForLookup);
		if (!guessedTown?.length) {
			if (cachedIsCountryName(parts[0])) {
				country = parts[0];
				// Normalize country name to English
				country = cachedDetectCountryName(country);
			} else {
				town = parts[0];
			}
		}
	}

	const dataList = guessedTown?.length
		? guessedTown.map((g) => ({
				country: g.country,
				county: g.county,
				map: g.map,
				town: parts[0],
			}))
		: [{ country, county, town, map: undefined }];
	const leftParts = parts.toSpliced(-3);

	placeCaches.placeParts[partsString] = dataList.map((d) => ({
		country: d.country,
		county: d.county,
		town: d.town,
		map: d.map,
		leftParts,
		parts,
		current: [...leftParts, d.town, d.county, d.country]
			.filter(Boolean)
			.join(", "),
		original: partsString,
	}));
	return placeCaches.placeParts[partsString];
};

export const getCurrentNameOfTown = (
	place?: string | string[],
	usedTownConfig?: Towns | CountryBasedTowns,
	onlyIfDifferent?: boolean
) => {
	if (!place) {
		return;
	}
	const { town, country, leftParts, current } = getPlaceParts(place)[0];

	let townRanges: Partial<PureRanges> | undefined;

	if (town) {
		const parsed = parseTowns(usedTownConfig);
		const firstKey = Object.keys(parsed)[0];
		if (
			firstKey &&
			typeof parsed[firstKey] === "object" &&
			!Array.isArray(parsed[firstKey])
		) {
			const potentialCountryData = parsed[firstKey] as Record<
				string,
				unknown
			>;
			if (
				Object.keys(potentialCountryData).some(
					(k) =>
						k !== "names" &&
						typeof potentialCountryData[k] === "object"
				)
			) {
				// Country-based - search all countries
				const countryBased = parsed as CountryBasedPureTowns;
				for (const countryTowns of Object.values(countryBased)) {
					if (countryTowns[town]) {
						townRanges = countryTowns[town];
						break;
					}
				}
			} else {
				// Flat
				townRanges = (parsed as PureTowns)[town];
			}
		} else {
			// Flat
			townRanges = (parsed as PureTowns)[town];
		}
	}

	if (!townRanges) {
		return;
	}

	const cache = getCache(usedTownConfig);
	const cacheKey = place.toString();
	if (!cache.current[cacheKey]) {
		let result: (string | undefined)[][] = [];
		if (townRanges && typeof townRanges !== "string") {
			const recentKey = Object.keys(townRanges ?? {}).find((k) =>
				k.endsWith("-")
			) as PrimitiveRange | undefined;
			const recent = recentKey && townRanges[recentKey];
			if (recent && typeof recent !== "string") {
				const currentTowns = Array.isArray(recent) ? recent : [recent];

				currentTowns.forEach((currentTown) => {
					const currentTownName = currentTown.town;
					// Use currentTown.leftParts if it exists, otherwise fall back to original leftParts
					const currentLeftParts = currentTown.leftParts ?? leftParts;
					if (Array.isArray(currentTownName)) {
						result = [
							...result,
							...currentTownName.map((t) => [
								...currentLeftParts,
								t,
								currentTown.county,
								currentTown.country || country,
							]),
						];
					} else {
						result = [
							...result,
							[
								...currentLeftParts,
								currentTownName,
								currentTown.county,
								currentTown.country || country,
							],
						];
					}
				});
			} else if (recent && typeof recent === "string") {
				result = [...result, [...leftParts, town, recent, country]];
			}
		} else if (typeof townRanges === "string") {
			result = [...result, [...leftParts, town, townRanges, country]];
		}

		cache.current[cacheKey] = result.map((r) => getPlaceParts(r)[0]);
	}

	if (onlyIfDifferent) {
		const same = cache.current[cacheKey].some(
			(p) => p.current?.toLowerCase() === current?.toLowerCase()
		);
		if (same) {
			return;
		}
	}

	return cache.current[cacheKey];
};

export const getValidCountyByTownAndYear = (
	place: string | string[],
	date?: CommonDate | number | string,
	usedTownConfig?: Towns | CountryBasedTowns
): TownData[] => {
	const { country, county, town } = getPlaceParts(place)[0];

	// Use fallback if no config provided
	const townConfig = usedTownConfig || getCombinedDetailedTownsByCountry();

	// Helper to check if structure is country-based
	const checkIsCountryBased = (data: Towns | CountryBasedTowns): boolean => {
		const keys = Object.keys(data);
		return (
			keys.length > 0 &&
			keys.every((key) => {
				if (!isCountryName(key)) return false;
				const value = data[key];
				if (
					typeof value !== "object" ||
					value === null ||
					Array.isArray(value)
				) {
					return false;
				}
				const valueKeys = Object.keys(value);
				const hasRangeKeys = valueKeys.some(
					(k) => k === "names" || /^-?\d*-\d*$/.test(k)
				);
				return !hasRangeKeys;
			})
		);
	};

	// Convert country-based structure to flat if needed
	let flatTowns: Towns | undefined = townConfig as Towns;
	if (townConfig && checkIsCountryBased(townConfig)) {
		flatTowns = convertCountryBasedToFlat(townConfig as CountryBasedTowns);
	}

	const parsedTowns = parseTowns(flatTowns);

	// parseTowns now returns flat PureTowns since we converted to flat above
	const townRanges: Partial<PureRanges> | undefined = town
		? (parsedTowns as PureTowns)[town]
		: undefined;

	const year =
		date instanceof CommonDate
			? date?.YEAR
			: date
				? { value: date }
				: undefined;

	// todo handle string and number as year need to create a common inRange
	if (!town || !townRanges || !year) {
		return [
			{
				response: !townRanges ? "Not found" : "No date set",
				townResponse: !townRanges ? "Not found" : "No date set",
				countyResponse: !townRanges ? "Not found" : "No date set",
				countryResponse: !townRanges ? "Not found" : "No date set",
				county,
				town: town || "Missing",
				country,
				range: "-",
			},
		];
	}

	const cache = getCache(usedTownConfig);
	// const cacheKey = `${town}-${year.value}`;

	const cacheKey = `${place.toString()}-${year.value}`;
	if (cache.county[cacheKey]) {
		// return cache.county[cacheKey];
	}

	let result: TownData[] | undefined;
	if (typeof townRanges === "string") {
		result = [
			{
				range: "-",
				county: townRanges,
				town,
				country,
				response: "Invalid",
				townResponse: "Invalid",
				countyResponse: "Invalid",
				countryResponse: "Invalid",
			},
		];
	} else {
		const found = Object.entries(townRanges).find(([range]) => {
			if (date instanceof CommonDate) {
				return date.inRange(range as PrimitiveRange, true);
			}

			return inRange(date, range as PrimitiveRange, true);
		}) as [PrimitiveRange, Town | Town[] | undefined];

		if (found?.[1]) {
			if (typeof found[1] === "string") {
				result = [
					{
						range: found[0] as PrimitiveRange,
						county: found[1],
						town,
						country,
						response: "Invalid",
						townResponse: "Invalid",
						countyResponse: "Invalid",
						countryResponse: "Invalid",
					},
				];
			} else if (Array.isArray(found[1])) {
				result = found[1].map((f) => {
					return {
						range: found[0] as PrimitiveRange,
						county: f.county || county,
						town: f.town || town,
						country: f.country || country,
						leftParts: f.leftParts,
						response: "Invalid",
						townResponse: "Invalid",
						countyResponse: "Invalid",
						countryResponse: "Invalid",
					};
				});
			} else {
				result = [
					{
						range: found[0] as PrimitiveRange,
						county: found[1].county || county,
						town: found[1].town || town,
						country: found[1].country || country,
						leftParts: found[1].leftParts,
						response: "Invalid",
						townResponse: "Invalid",
						countyResponse: "Invalid",
						countryResponse: "Invalid",
					},
				];
			}
		} else {
			result = [
				{
					response: "Invalid",
					townResponse: "Invalid",
					countyResponse: "Invalid",
					countryResponse: "Invalid",
					county,
					town,
					country,
					range: "-",
				},
			];
		}
	}

	result.forEach((r) => {
		r.townResponse = includesLowerCase(r.town, town) ? "Valid" : "Invalid";
		r.countyResponse = includesLowerCase(r.county, county)
			? "Valid"
			: "Invalid";
		r.countryResponse = includesLowerCase(r.country, country)
			? "Valid"
			: "Invalid";
		if (
			r.response === "Invalid" &&
			r.townResponse === "Valid" &&
			r.countyResponse === "Valid" &&
			r.countryResponse === "Valid"
		) {
			r.response = "Valid";
		}
	});

	cache.county[cacheKey] = result;
	return result;
};

export const placesValidator = (
	gedcom: GedComType,
	usedTownConfig?: Towns,
	usedCountry: string | string[] = [],
	usedTown: string | string[] = [],
	usedIndis: IndiKey[] = []
) => {
	const usedCountries = Array.isArray(usedCountry)
		? usedCountry
		: [usedCountry];
	const usedTowns = (Array.isArray(usedTown) ? usedTown : [usedTown]).reduce<
		string[]
	>((acc, curr) => {
		return [...acc, ...getTownNames(curr, usedTownConfig)];
	}, []);

	const commonMistakes: Record<string, IndiKey[]> = {};
	const onlyCountry: Record<string, IndiKey[]> = {};
	const missingCountries: Record<string, IndiKey[]> = {};
	const missingCounties: Record<string, IndiKey[]> = {};
	const whiteSpaces: Record<string, IndiKey[]> = {};
	const towns: Record<string, Record<IndiKey, TownValidity[][]>> = {};
	let invalidTownCounter = 0;
	const allPlaces = gedcom
		.indis()
		?.reduce<Record<string, IndiKey[]>>((acc, curr) => {
			if (
				!curr.id ||
				(usedIndis.length && !usedIndis.includes(curr.id))
			) {
				return acc;
			}
			const places = curr.getPlaces();

			places.forEach((place) => {
				if (!place.place || !curr.id) {
					return;
				}
				const { parts, leftParts, original } = getPlaceParts(
					place.place
				)[0];
				const lastPart = parts[parts.length - 1];

				if (
					usedCountries.length &&
					!includesLowerCase(usedCountries, lastPart)
				) {
					return;
				}

				const date = place?.obj?.get("DATE") as CommonDate | undefined;
				// Detect country name from the place for context-aware guessing
				const countryNameForGuess = lastPart
					? cachedDetectCountryName(lastPart)
					: undefined;
				const guessedTown = guessTown(
					parts[0],
					date,
					countryNameForGuess
				);
				const onlyTown = parts.length === 1 ? guessedTown : undefined;
				const townList =
					parts.length > 1
						? guessedTown && guessedTown.length > 1
							? guessedTown.map((g) => ({
									isOnly: false,
									guessed: g,
									parts,
								}))
							: [
									{
										isOnly: false,
										parts,
										guessed: guessedTown?.[0],
									},
								]
						: onlyTown
							? onlyTown.map((g) => ({
									isOnly: true,
									guessed: g,
									parts,
								}))
							: [];
				// if(parts.length > 1 || onlyTown)

				const validities: TownValidity[] = [];
				townList.forEach((townListItem) => {
					if (!place.place || !curr.id) {
						return;
					}
					const { parts: p, guessed: g, isOnly } = townListItem;
					const countyPart =
						isOnly && g?.county ? g.county : p[p.length - 2];
					const townPart = isOnly
						? p[0]
						: p[p.length - 3] || countyPart;

					if (
						usedTowns.length &&
						!includesLowerCase(usedTowns, townPart)
					) {
						return;
					}

					const validityResponse = getValidCountyByTownAndYear(
						parts,
						date,
						usedTownConfig
					);

					const validValidities = validityResponse.filter(
						(res) => res.response === "Valid"
					);
					validityResponse.forEach((res) => {
						if (
							res.response === "Not found" ||
							res.response === "No date set" ||
							!date?.YEAR
						) {
							validities.push({
								invalidCounty:
									!isOnly && res.county
										? res.county
										: "Not found",
								invalidTown: res.town ? res.town : "Not found",
								invalidCountry:
									!isOnly && res.country
										? res.country
										: "Not found",
								year: date?.YEAR?.value,
								original: place.place,
								validTown:
									g && res.town ? res.town : res.response,
								validCounty: isOnly
									? g?.county || res.response
									: res.response,
								validCountry: isOnly
									? g?.country || res.response
									: res.response,
								townResponse: res.townResponse,
								countyResponse: res.countyResponse,
								countryResponse: res.countryResponse,
								suggestedTown: g ? res.town : undefined,
								suggestedCounty: g?.county,
								suggestedCountry: g?.country,
								suggestedMap: [g?.map || ""],
								range: res.response,
								type: place.key,
								objId: place.ref?.uniqueId,
								leftParts,
							});
							// invalidTownCounter++;
						} else if (res.response === "Invalid") {
							const {
								county: validCounty,
								town: validTown,
								range: validRange,
								country: validCountry,
								leftParts: validLeftParts,
							} = res ?? {};

							const invalidCounty =
								validCounty &&
								!includesLowerCase(validCounty, countyPart);
							const invalidTown =
								validTown &&
								!includesLowerCase(validTown, townPart);
							const invalidCountry =
								validCountry &&
								!includesLowerCase(
									validCountry,
									lastPart || ""
								);

							if (
								!validCounty ||
								invalidCounty ||
								invalidTown ||
								invalidCountry
							) {
								const validTownValues = ensureArray(validTown);
								const newGuessedTown = validTownValues
									.map((name) => {
										const townNames = [name].concat(
											validTownValues.length > 1
												? []
												: getTownNames(
														name,
														usedTownConfig
													).filter((n) => n !== name)
										);
										return townNames.reduce<
											| {
													county?: string;
													country?: string;
													map?: string;
											  }
											| undefined
										>((acc, n) => {
											if (acc?.map) {
												return acc;
											}

											const result = guessTown(
												n,
												date,
												countryNameForGuess
											)?.[0];

											return result?.map ? result : acc;
										}, undefined);
									})
									.map((g) => g?.map || "");
								const newGuessedMaps =
									newGuessedTown.length > 1
										? newGuessedTown
										: newGuessedTown[0];

								validities.push({
									invalidTown: townPart || "Not found",
									invalidCounty: countyPart || "Not found",
									invalidCountry: lastPart || "Not found",
									original: place.place,
									year: date?.YEAR?.value,
									validCounty:
										validCounty || "Cannot be determined",
									validTown:
										validTown || "Cannot be determined",
									validCountry:
										validCountry || "Cannot be determined",
									townResponse: invalidTown
										? "Invalid"
										: "Valid",
									countyResponse: invalidCounty
										? "Invalid"
										: "Valid",
									countryResponse: invalidCountry
										? "Invalid"
										: "Valid",
									suggestedTown: undefined,
									suggestedCounty: g?.county,
									suggestedCountry: g?.country,
									invalidMap: g?.map,
									suggestedMap: newGuessedMaps,
									range: validRange,
									type: place.key,
									objId: place.ref?.uniqueId,
									leftParts,
									validLeftParts,
								});
								// invalidTownCounter++;
							}
						} else if (
							res.response === "Valid" &&
							validValidities.length !== validityResponse.length
						) {
							const {
								county: validCounty,
								town: validTown,
								range: validRange,
								country: validCountry,
								leftParts: validLeftParts,
							} = res ?? {};

							validities.push({
								invalidTown: validTown || "Not found",
								invalidCounty: validCounty || "Not found",
								invalidCountry: validCountry || "Not found",
								original: place.place,
								year: date?.YEAR?.value,
								validCounty:
									validCounty || "Cannot be determined",
								validTown: validTown || "Cannot be determined",
								validCountry:
									validCountry || "Cannot be determined",
								townResponse: "Valid",
								countyResponse: "Valid",
								countryResponse: "Valid",
								range: validRange,
								type: place.key,
								objId: place.ref?.uniqueId,
								leftParts,
								validLeftParts,
							});
							// invalidTownCounter++;
						}
					});
				});

				if (validities.length) {
					if (!towns[original]) {
						towns[original] = {};
					}

					if (!towns[original][curr.id]) {
						towns[original][curr.id] = [];
					}
					towns[original][curr.id].push(validities);

					invalidTownCounter += validities.length;
				}

				if (lastPart && parts.length <= 1) {
					onlyCountry[lastPart] = [
						...(onlyCountry[lastPart] ?? []),
						curr.id,
					];
				}

				// Use country-specific county regexp for validation
				const countyRegexpForValidation = countryNameForGuess
					? createCountyRegexp(countryNameForGuess)
					: /(?!.*)/g; // Regexp that never matches if no country detected (with global flag for matchAll)
				const countyParts = Array.from(
					place.place?.matchAll(countyRegexpForValidation) ?? []
				);

				if (!countyParts.length && place.place) {
					missingCounties[place.place] = [
						...(missingCounties[place.place] ?? []),
						curr.id,
					];
				}

				if (
					place.place.startsWith(" ") ||
					place.place.endsWith(" ") ||
					/\s{2,}/.test(place.place)
				) {
					whiteSpaces[place.place] = [
						...(whiteSpaces[place.place] ?? []),
						curr.id,
					];
				}

				if (lastPart && !cachedIsCountryName(lastPart)) {
					missingCountries[lastPart] = [
						...(missingCountries[lastPart] ?? []),
						curr.id,
					];
				}

				// if()

				if (
					commonMistakesKey.includes(lastPart) ||
					new RegExp(commonMistakesKey.join("|")).test(place.place) ||
					/\s{2,}/.test(place.place) ||
					/,{2,}/.test(place.place) ||
					!/^\s*\p{Lu}[^,]*(?:,\s*\p{Lu}[^,]*)*$/u.test(place.place)
				) {
					commonMistakes[place.place] = [
						...(commonMistakes[place.place] ?? []),
						curr.id,
					];
				}

				if (!acc[place.place]) {
					acc[place.place] = [];
				}

				acc[place.place].push(curr.id!);
			});

			return acc;
		}, {});
	const placeNames = Object.keys(allPlaces ?? {});
	const similarPlaces = placeNames.reduce<
		Record<number, Record<string, Record<string, IndiKey[]>>>
	>((acc, place) => {
		placeNames.forEach((otherPlace) => {
			const distance = leveinstein(place, otherPlace);

			if (distance > 0 && distance < 5) {
				if (!acc[distance]) {
					acc[distance] = {};
				}
				if (!acc[distance][place]) {
					acc[distance][place] = {};
				}

				if (!acc[distance][place][otherPlace]) {
					acc[distance][place][otherPlace] = [];
				}

				acc[distance][place][otherPlace].push(
					...(allPlaces?.[place] ?? [])
				);
			}
		});
		return acc;
	}, {});

	return {
		allPlaces,
		placeNames,
		similarPlaces,
		missingCountries,
		missingCounties,
		whiteSpaces,
		commonMistakes,
		onlyCountry,
		towns,
		townsCount: invalidTownCounter, //Object.values(locations).length,
	};
};

// globalThis.getPlaceParts = getPlaceParts;
// globalThis.placesValidator = placesValidator;
// globalThis.getCurrentNameOfTown = getCurrentNameOfTown;
// globalThis.getValidCountyByTownAndYear = getValidCountyByTownAndYear;

export interface Place {
	key: string;
	index: number;
	obj?: Common;
	ref?: Common;
	place?: string;
}

export enum PlaceType {
	All = "ALL",
	Birth = "BIRT",
	Marriage = "MARR",
	Death = "DEAT",
	Events = "EVEN",
	Military = "_MILT",
	MilitaryId = "_MILTID",
}

export const getPlaces = (
	common: Common | List,
	type: PlaceType | Tag | Array<PlaceType | Tag> = [PlaceType.All],
	maxLevel = 1,
	level = 0,
	mainKey?: string
) => {
	const types = Array.isArray(type) ? type : [type];
	const places: Place[] = [];
	if (!common?.toList || level > maxLevel) {
		return places;
	}

	const commonList = common.toList();

	commonList.forEach((item, _, index) => {
		(Object.entries(item) as Array<[string, Common]>).forEach(
			([key, value]) => {
				if (!/^[_A-Z0-9]+$/.test(key)) {
					return;
				}
				if (
					level === 0 &&
					!types.includes(PlaceType.All) &&
					((!types.includes(key as PlaceType) &&
						[
							PlaceType.Birth,
							PlaceType.Marriage,
							PlaceType.Death,
						].includes(key as PlaceType)) ||
						(!types.includes(PlaceType.Events) &&
							![
								PlaceType.Birth,
								PlaceType.Marriage,
								PlaceType.Death,
								PlaceType.Military,
								PlaceType.MilitaryId,
							].includes(key as PlaceType)) ||
						(!types.includes(PlaceType.Military) &&
							!types.includes(PlaceType.MilitaryId) &&
							![
								PlaceType.Birth,
								PlaceType.Marriage,
								PlaceType.Death,
								PlaceType.Events,
							].includes(key as PlaceType)))
				) {
					return;
				}
				if (key === "PLAC") {
					value.toList().forEach((place) => {
						places.push({
							index,
							place: place.toValue(),
							obj: place,
							key: mainKey || key,
						});
					});
				} else {
					getPlaces(
						value,
						types,
						maxLevel,
						level + 1,
						mainKey || key
					).forEach((place) => {
						const usedValue =
							value instanceof List
								? value.index(place.index)
								: value;
						places.push({
							place: place.place,
							obj: usedValue,
							ref: place.obj,
							index: place.index,
							key: place.key,
						});
					});
				}
			}
		);
	});

	return places;
};

/**
 * Format a place name for geocoding: city-to-country format with English country name
 * This ensures consistent formatting for geocoding APIs like Photon
 * @param place - The place string in any format
 * @returns Formatted place string in city-to-country format with English country name
 */
export const formatPlaceForGeocoding = (
	place: string | (string | undefined)[]
): string => {
	if (!place) return "";

	const placeString = Array.isArray(place)
		? place.filter(Boolean).join(", ")
		: place;

	if (!placeString.trim()) return "";

	// Use getPlaceParts to normalize the place (handles country-to-city reversal)
	const placeParts = getPlaceParts(placeString);
	if (!placeParts || placeParts.length === 0) {
		return placeString;
	}

	// Get the first result (getPlaceParts returns an array of possible matches)
	const { town, county, country, leftParts } = placeParts[0];

	// Build normalized parts array in city-to-country order
	const parts = [...leftParts, town, county, country].filter(
		Boolean
	) as string[];

	if (parts.length === 0) return placeString;

	// Translate the last part (country) to English if it exists
	const lastPart = parts[parts.length - 1];
	const englishCountryName = detectCountryName(lastPart);
	if (englishCountryName) {
		parts[parts.length - 1] = englishCountryName;
	}

	return parts.join(", ");
};

// Re-export country registry functions for external use
export {
	type CountryData as CountryDataType,
	type CountryBasedTowns,
	type LetterVariants,
	detectCountryName,
	getCountryData,
	getAllCountryTranslations,
	getCountiesForCountry,
	getTownSourcesForCountry,
	getDetailedTownsForCountry,
	getAllDetailedTowns,
	getCombinedDetailedTowns,
	getCombinedDetailedTownsByCountry,
	convertCountryBasedToFlat,
	isCountryName,
	getAllCountryNames,
	getRegisteredCountryNames,
	getCountriesWithDetailedTowns,
	registerCountry,
	generateTownVariants,
	getLetterVariantsForCountry,
} from "./country-registry";

// Re-export cache management functions for external use
export {
	type PlaceCacheStore,
	placeCaches,
	getOrSetCache,
	clearPlaceCaches,
	clearCacheType,
	getCacheStats,
	setCacheEnabled,
	isCacheEnabled,
} from "./cache";
