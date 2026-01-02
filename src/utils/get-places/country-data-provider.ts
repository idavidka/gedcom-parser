/**
 * Pluggable Country Data Provider for gedcom-parser
 * 
 * The gedcom-parser package needs country/county/town data for place matching,
 * but doesn't include the actual data to keep the package lightweight.
 * 
 * Default behavior: Empty data - no place matching (safe, but limited functionality)
 * 
 * @example
 * ```typescript
 * // Consumer provides country data:
 * import { setCountryDataProvider } from '@treeviz/gedcom-parser';
 * 
 * import huCountries from './translation/hu-countries.json';
 * import huCounties from './sources/hungary/counties.json';
 * // ... import all your country data
 * 
 * setCountryDataProvider({
 *   translations: {
 *     hu: huCountries,
 *     en: enCountries,
 *     // ... other languages
 *   },
 *   countries: {
 *     HU: {
 *       counties: huCounties,
 *       towns: {
 *         '2020': huTowns2020,
 *         '1913': huTowns1913,
 *         detailed: huTownsDetailed,
 *       }
 *     },
 *     AT: {
 *       counties: atCounties,
 *       towns: {
 *         '1910': atTowns1910,
 *         latest: atTownsLatest,
 *         detailed: atTownsDetailed,
 *       }
 *     }
 *     // ... other countries
 *   }
 * });
 * ```
 */

/**
 * Country translations for different languages
 */
export interface CountryTranslations {
	[key: string]: string;
}

/**
 * County/region data for a country
 */
export interface CountyData {
	[key: string]: string;
}

/**
 * Town data source with metadata
 */
export interface TownSource {
	_source: {
		en: string;
		hu?: string;
		de?: string;
	};
	_year?: number;
	data: unknown; // Flexible data structure - different formats for different sources
}

/**
 * Town data collections for a country
 */
export interface TownDataCollection {
	[key: string]: TownSource; // e.g., '2020', '1913', 'detailed', 'latest', etc.
}

/**
 * Country data including counties and towns
 */
export interface CountryData {
	counties: CountyData;
	towns: TownDataCollection;
}

/**
 * Complete country data provider structure
 */
export interface ICountryDataProvider {
	/**
	 * Country name translations by language code
	 */
	translations: {
		[languageCode: string]: CountryTranslations;
	};

	/**
	 * Country-specific data by country code (e.g., 'HU', 'AT')
	 */
	countries: {
		[countryCode: string]: CountryData;
	};
}

/**
 * Default empty country data provider
 * Returns empty objects - place matching won't work, but won't crash
 */
class NoOpCountryDataProvider implements ICountryDataProvider {
	translations = {};
	countries = {};
}

// Global data provider - starts as empty (no data by default)
let countryDataProvider: ICountryDataProvider = new NoOpCountryDataProvider();

/**
 * Set the country data provider
 * Call this in your app initialization to enable place matching
 * 
 * If not called, place matching will return empty results
 * 
 * @param provider Country data provider with translations and country-specific data
 * 
 * @example
 * ```typescript
 * import { setCountryDataProvider } from '@treeviz/gedcom-parser';
 * import huCountries from './translation/hu-countries.json';
 * 
 * setCountryDataProvider({
 *   translations: {
 *     hu: huCountries,
 *     en: enCountries,
 *   },
 *   countries: {
 *     HU: {
 *       counties: huCounties,
 *       towns: {
 *         '2020': huTowns2020,
 *         '1913': huTowns1913,
 *         detailed: huTownsDetailed,
 *       }
 *     }
 *   }
 * });
 * ```
 */
export const setCountryDataProvider = (provider: ICountryDataProvider) => {
	countryDataProvider = provider;
};

/**
 * Get the configured country data provider
 * Returns empty provider if setCountryDataProvider() was not called
 */
export const getCountryDataProvider = (): ICountryDataProvider => {
	return countryDataProvider;
};

/**
 * Get country translations for a specific language
 * @param languageCode Language code (e.g., 'hu', 'en', 'de')
 * @returns Country translations or empty object
 */
export const getCountryTranslations = (
	languageCode: string
): CountryTranslations => {
	return countryDataProvider.translations[languageCode] || {};
};

/**
 * Get country data by country code
 * @param countryCode Country code (e.g., 'HU', 'AT')
 * @returns Country data or undefined
 */
export const getCountryData = (
	countryCode: string
): CountryData | undefined => {
	return countryDataProvider.countries[countryCode];
};

/**
 * Get all available country codes
 * @returns Array of country codes
 */
export const getAvailableCountries = (): string[] => {
	return Object.keys(countryDataProvider.countries);
};

/**
 * Get all available language codes for translations
 * @returns Array of language codes
 */
export const getAvailableLanguages = (): string[] => {
	return Object.keys(countryDataProvider.translations);
};
