/**
 * I18n provider factory for pluggable translation
 * This allows the main project to inject its i18n instance
 */

/**
 * I18n provider function type.
 * Mimics the i18next.t() function signature.
 */
export type I18nProvider = (
	key: string,
	options?: Record<string, unknown>
) => string;

/**
 * Default i18n provider (returns the key itself as fallback)
 */
let i18nProvider: I18nProvider = (key: string) => key;

/**
 * Set a custom i18n provider.
 * This allows the main project to inject its i18n translation function.
 *
 * @example
 * ```typescript
 * import { setI18nProvider } from '@treeviz/gedcom-parser/factories/i18n-factory';
 * import i18n from './translation/i18n';
 *
 * setI18nProvider((key, options) => i18n.t(key, options));
 * ```
 */
export const setI18nProvider = (provider: I18nProvider) => {
	i18nProvider = provider;
};

/**
 * Get the current i18n provider.
 * Used internally for translations.
 */
export const getI18n = (): I18nProvider => {
	return i18nProvider;
};

/**
 * Reset to the default i18n provider.
 * Useful for testing.
 */
export const resetI18nProvider = () => {
	i18nProvider = (key: string) => key;
};

/**
 * Helper object that mimics i18next interface
 * Usage: i18n.t(key, options)
 */
export const i18n = {
	t: (key: string, options?: Record<string, unknown>) =>
		i18nProvider(key, options),
};
