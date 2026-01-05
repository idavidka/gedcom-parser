import type { Locale } from "date-fns";

/**
 * Date locale provider function type.
 * Returns the date-fns Locale object for the current language.
 */
export type DateLocaleProvider = () => Locale | undefined;

/**
 * Default date locale provider (returns undefined, date-fns will use default behavior)
 */
let dateLocaleProvider: DateLocaleProvider = () => undefined;

/**
 * Set a custom date locale provider.
 * This allows the main project or external projects to override the date locale logic.
 *
 * @example
 * ```typescript
 * import { setDateLocaleProvider } from '@treeviz/gedcom-parser/factories/date-locale-factory';
 * import { getDateFnsLocale } from './constants/ui-options';
 *
 * setDateLocaleProvider(getDateFnsLocale);
 * ```
 */
export const setDateLocaleProvider = (provider: DateLocaleProvider) => {
  dateLocaleProvider = provider;
};

/**
 * Get the current date locale.
 * Used internally by the Date class for formatting dates.
 */
export const getDateLocale = (): Locale | undefined => {
  const result = dateLocaleProvider();
  return result;
};

/**
 * Reset to the default date locale provider.
 * Useful for testing or when switching between projects.
 */
export const resetDateLocaleProvider = () => {
  dateLocaleProvider = () => undefined;
};
