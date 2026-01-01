/**
 * Settings types for gedcom-parser
 * These are extracted interfaces that the consumer app can implement
 */

// Type definitions
export type NameOrder = "first-last" | "last-first";
export type PlaceOrder = "country-to-city" | "city-to-country";
export type CurrentNameOfTown = "no" | "show" | "merge";
export type LinkedPersons = "merge" | "clone" | "skip";

export interface Settings {
	// Date formatting
	dateFormatPattern?: string; // e.g., "YYYY-MM-DD", "DD/MM/YYYY"
	
	// Place formatting
	placeOrder?: PlaceOrder;
	currentNameOfTown?: CurrentNameOfTown;
	
	// Name formatting
	nameOrder?: NameOrder;
	maxGivennames?: number; // Maximum number of given names to show
	maxSurnames?: number; // Maximum number of surnames to show
	showSuffix?: boolean; // Whether to show name suffixes (Jr., Sr., etc.)
	
	// Display options
	showMarriages?: boolean;
	showKinship?: boolean;
	showAlternateDates?: boolean;
	
	// Linking settings
	linkedPersons?: LinkedPersons;
	linkingKey?: string; // MultiTag type
	
	// Other settings - extensible
	[key: string]: unknown;
}

// Default settings
export const defaultSettings: Settings = {
	dateFormatPattern: "YYYY-MM-DD",
	placeOrder: "city-to-country",
	currentNameOfTown: "no",
	nameOrder: "first-last",
	maxGivennames: 0,
	maxSurnames: 0,
	showSuffix: true,
	showMarriages: true,
	showKinship: false,
	showAlternateDates: false,
	linkedPersons: "skip",
};
