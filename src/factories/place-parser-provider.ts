/**
 * Place Parser Provider Factory
 * Allows consumer applications to provide their own place parsing implementation
 */

import type { PlaceParts } from "../utils/place-parser";

/**
 * Place parser function type
 * Receives a place string or array and returns parsed place parts
 */
export type PlaceParserFunction = (
	place: string | (string | undefined)[]
) => PlaceParts[];

/**
 * Default place parser provider (returns undefined, uses built-in parser)
 */
let placeParserProvider: PlaceParserFunction | undefined;

/**
 * Set the place parser provider
 * @param parser - Custom place parser function
 * @example
 * ```typescript
 * import { setPlaceParserProvider } from '@treeviz/gedcom-parser';
 * import { getPlaceParts } from './my-place-parser';
 *
 * setPlaceParserProvider(getPlaceParts);
 * ```
 */
export const setPlaceParserProvider = (
	parser: PlaceParserFunction | undefined
): void => {
	placeParserProvider = parser;
};

/**
 * Get the current place parser provider
 * @returns The current place parser function or undefined
 */
export const getPlaceParserProvider = (): PlaceParserFunction | undefined => {
	return placeParserProvider;
};

/**
 * Reset the place parser provider to default (undefined)
 */
export const resetPlaceParserProvider = (): void => {
	placeParserProvider = undefined;
};
