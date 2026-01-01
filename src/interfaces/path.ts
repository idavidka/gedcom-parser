/**
 * Path-related types and interfaces for kinship calculations
 */

import type { IndiType } from "../classes/indi";
import type { RelationType } from "../types";
// eslint-disable-next-line import/order
import type { Kinship } from "../kinship-translator/kinship-translator.interface";

export type { Kinship };

export interface PathItem {
	indi: IndiType;
	level: number;
	levelUp: number;
	levelDown: number;
	degree: number;
	kinship: Kinship;
	relation?: RelationType;
	inLaw?: boolean;
	breakOnNext?: boolean;
	breakAfterNext?: boolean;
}

export type Path = PathItem[];
export type ReducedPath = Array<
	Omit<PathItem, "breakOnNext" | "breakAfterNext">
>;

export type QueueItem = {
	path: Path;
} & PathItem;
export type Queue = QueueItem[];
