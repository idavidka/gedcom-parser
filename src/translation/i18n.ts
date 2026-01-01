/**
 * Translation support for gedcom-parser
 * This is a pluggable system - the consumer app can provide their own translation function
 */

export type Language = string; // e.g., "en", "hu", "de", etc.

// Translation function type
export type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

// Default translation function (returns key as-is)
let translationFn: TranslationFunction = (key: string) => key;

// Current language
let currentLanguage: Language = "en";

/**
 * Set the translation function to be used by the parser
 * @param fn - Translation function that takes a key and returns translated text
 * 
 * @example
 * ```ts
 * import { setTranslationFunction } from '@treeviz/gedcom-parser';
 * import i18next from 'i18next';
 * 
 * setTranslationFunction((key, options) => i18next.t(key, options));
 * ```
 */
export function setTranslationFunction(fn: TranslationFunction): void {
	translationFn = fn;
}

/**
 * Set the current language
 * @param lang - Language code (e.g., "en", "hu", "de")
 */
export function setLanguage(lang: Language): void {
	currentLanguage = lang;
}

/**
 * Get the current language
 */
export function getLanguage(): Language {
	return currentLanguage;
}

/**
 * Translate a key using the configured translation function
 * @param key - Translation key
 * @param options - Optional parameters for translation
 */
export function t(key: string, options?: Record<string, unknown>): string {
	return translationFn(key, options);
}

// Create a default i18n-like object for compatibility
const i18n = {
	t,
	language: currentLanguage,
	changeLanguage: setLanguage,
};

export default i18n;
