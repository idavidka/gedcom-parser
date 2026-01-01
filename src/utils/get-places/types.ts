import type { PrimitiveRange } from "../range";

export type TownSource = {
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
};

export type Town = {
	leftParts?: string[];
	county?: string;
	town: string | string[];
	country?: string;
};
export type PureTown = {
	county?: string;
	town: string[];
	country?: string;
	leftParts?: string[];
};
export type TownData = {
	response: "Not found" | "No date set" | "Valid" | "Invalid";
	townResponse: "Not found" | "No date set" | "Valid" | "Invalid";
	countyResponse: "Not found" | "No date set" | "Valid" | "Invalid";
	countryResponse: "Not found" | "No date set" | "Valid" | "Invalid";
	range: PrimitiveRange;
} & Town;

export type TownValidity = {
	invalidTown: string | string[];
	validTown: string | string[];
	suggestedTown?: string | string[];
	invalidCountry: string;
	validCountry: string;
	suggestedCountry?: string;
	invalidCounty: string;
	validCounty: string;
	suggestedCounty?: string;
	townResponse?: string;
	countyResponse?: string;
	countryResponse?: string;
	year?: string;
	current?: string;
	original?: string;
	range?: string;
	type?: string;
	objId?: string;
	leftParts?: string[];
	validLeftParts?: string[];
	invalidMap?: string;
	suggestedMap?: string | (string | undefined)[];
};
export type FlatTownValidity = Omit<
	TownValidity,
	"validTown" | "suggestedMap"
> & {
	invalidTown: string;
	validTown: string;
	suggestedTown: string;
	suggestedMap?: string;
};

export type Towns = Record<string, Partial<Ranges> | string>;
export type RawRanges = Record<PrimitiveRange, Town | Town[] | string | null>;
export type Ranges = { names: string[] } & RawRanges;

export type PureTowns = Record<string, Partial<PureRanges>>;
export type PureRawRanges = Record<PrimitiveRange, PureTown[]>;
export type PureRanges = { names: string[] } & PureRawRanges;

// Country-based type for PureTowns
export type CountryBasedPureTowns = Record<string, PureTowns>;

export const isTown = (value: unknown): value is Town => {
	return typeof value === "object" && value !== null && "town" in value;
};

export const isRanges = (value: unknown): value is Ranges => {
	return (
		typeof value === "object" &&
		value !== null &&
		("names" in value || Object.keys(value).some((k) => /\d*-\d*/.test(k)))
	);
};
