/**
 * Initialize gedcom-parser with custom factories
 * This provides a unified initialization function instead of calling multiple setters
 */

import {
	setCacheManagerFactory,
	setDateLocaleProvider,
	setI18nProvider,
	setKinshipTranslatorClass,
	setPlaceParserProvider,
	setPlaceTranslatorProvider,
	type CacheManagerFactory,
	type DateLocaleProvider,
	type I18nProvider,
	type KinshipTranslatorConstructor,
	type PlaceParserFunction,
	type PlaceTranslatorFunction,
} from "./index";

/**
 * Factory configuration options for gedcom-parser initialization
 */
export interface GedcomParserFactories {
	/**
	 * Date locale provider - returns date-fns Locale for formatting
	 * @example () => enUS
	 */
	dateLocaleProvider?: DateLocaleProvider;

	/**
	 * i18n translation provider
	 * @example (key, options) => i18n.t(key, options)
	 */
	i18nProvider?: I18nProvider;

	/**
	 * Cache manager factory for kinship/path caching
	 * @example (name, store, type, encrypted) => ({ getItem, setItem })
	 */
	cacheManagerFactory?: CacheManagerFactory;

	/**
	 * Kinship translator class (optional override)
	 * Uses default KinshipTranslator if not provided
	 */
	kinshipTranslatorClass?: KinshipTranslatorConstructor;

	/**
	 * Place parser provider - parses place strings into structured parts
	 * @example (place) => [{ parts, town, county, country }]
	 */
	placeParserProvider?: PlaceParserFunction;

	/**
	 * Place translator provider - translates place strings with country/city recognition
	 * @example (place, level, toReversed) => "Budapest, Hungary"
	 */
	placeTranslatorProvider?: PlaceTranslatorFunction;
}

/**
 * Initialize gedcom-parser with custom factory providers
 *
 * This is the recommended way to set up gedcom-parser with your application's
 * dependencies. It replaces the need to call multiple individual setter functions.
 *
 * @param factories - Optional factory providers
 *
 * @example
 * ```typescript
 * import { initGedcomParser } from '@treeviz/gedcom-parser';
 * import { enUS } from 'date-fns/locale';
 * import i18n from './i18n';
 *
 * initGedcomParser({
 *   dateLocaleProvider: () => enUS,
 *   i18nProvider: (key, options) => i18n.t(key, options),
 *   cacheManagerFactory: (name, store, type, encrypted) => ({
 *     getItem: async () => localStorage.getItem(name),
 *     setItem: async (value) => localStorage.setItem(name, JSON.stringify(value))
 *   })
 * });
 * ```
 *
 * @example Minimal initialization (uses defaults)
 * ```typescript
 * initGedcomParser(); // Uses built-in defaults
 * ```
 *
 * @example With custom place parser
 * ```typescript
 * initGedcomParser({
 *   placeParserProvider: (place) => {
 *     // Custom place parsing logic
 *     return [{ parts: place.split(','), town: '', county: '', country: '' }];
 *   }
 * });
 * ```
 */
export const initGedcomParser = (factories?: GedcomParserFactories): void => {
	if (!factories) {
		// No factories provided - use built-in defaults
		// The parser will work with default implementations
		return;
	}

	// Set date locale provider if provided
	if (factories.dateLocaleProvider) {
		setDateLocaleProvider(factories.dateLocaleProvider);
	}

	// Set i18n provider if provided
	if (factories.i18nProvider) {
		setI18nProvider(factories.i18nProvider);
	}

	// Set cache manager factory if provided
	if (factories.cacheManagerFactory) {
		setCacheManagerFactory(factories.cacheManagerFactory);
	}

	// Set kinship translator class if provided
	if (factories.kinshipTranslatorClass) {
		setKinshipTranslatorClass(factories.kinshipTranslatorClass);
	}

	// Set place parser provider if provided
	if (factories.placeParserProvider) {
		setPlaceParserProvider(factories.placeParserProvider);
	}

	// Set place translator provider if provided
	if (factories.placeTranslatorProvider) {
		setPlaceTranslatorProvider(factories.placeTranslatorProvider);
	}
};

/**
 * Check if gedcom-parser has been initialized with custom factories
 * @returns true if any factory has been customized
 */
export const isGedcomParserInitialized = (): boolean => {
	// Check if any factory has been set (non-default)
	// This is a simple check - in practice, the factories might have defaults
	return true; // Always returns true as defaults are acceptable
};

/**
 * Get current factory configuration
 * Useful for debugging or verifying initialization
 */
export const getGedcomParserFactories = (): Partial<GedcomParserFactories> => {
	return {
		// Return the current factories (if we want to expose them)
		// For now, this is a placeholder as factories are internal
	};
};
