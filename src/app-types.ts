/**
 * App-specific types stubs for GEDCOM parser
 * These are placeholder types that represent app-specific data structures
 */

// Settings stub (can be extended by host application)
export interface Settings {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

// Language stub (can be extended by host application)
export type Language = string;

// Ancestry media stub (can be extended by host application)
export interface AncestryMedia {
	url?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

// Graphic types stubs (can be extended by host application)
export interface Position {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}
