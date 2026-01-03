/**
 * Place-related types for GEDCOM parser
 * These are simple types used by the Indi class for place filtering
 */

import type { Common } from "../classes/common";

export interface Place {
	type: PlaceType;
	raw: string;
	parts: string[];
	level?: number;
	source?: string;
	// Legacy fields for backward compatibility
	key?: string;
	index?: number;
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
