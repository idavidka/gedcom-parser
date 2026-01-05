/**
 * Place Translator Provider Factory
 * Allows consumer applications to provide their own place translation implementation
 */

/**
 * Place translator function type
 * Receives place string or array and optional parameters, returns translated string
 * Compatible with main app's placeTranslator signature
 */
export type PlaceTranslatorFunction = (
	place?: string | string[],
	level?: number,
	toReversed?: boolean
) => string | undefined;

/**
 * Default place translator provider (returns undefined, uses built-in translator)
 */
let placeTranslatorProvider: PlaceTranslatorFunction | undefined;

/**
 * Set the place translator provider
 * @param translator - Custom place translator function
 * @example
 * ```typescript
 * import { setPlaceTranslatorProvider } from '@treeviz/gedcom-parser';
 * import { placeTranslator } from './my-place-translator';
 * 
 * setPlaceTranslatorProvider(placeTranslator);
 * ```
 */
export const setPlaceTranslatorProvider = (
	translator: PlaceTranslatorFunction | undefined
): void => {
	placeTranslatorProvider = translator;
};

/**
 * Get the current place translator provider
 * @returns The current place translator function or undefined
 */
export const getPlaceTranslatorProvider = ():
	| PlaceTranslatorFunction
	| undefined => {
	return placeTranslatorProvider;
};

/**
 * Reset the place translator provider to default (undefined)
 */
export const resetPlaceTranslatorProvider = (): void => {
	placeTranslatorProvider = undefined;
};
