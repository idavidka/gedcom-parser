# @treeviz/gedcom-parser

A lightweight, pluggable GEDCOM parser library for JavaScript/TypeScript applications. Originally part of [TreeViz](https://treeviz.com), extracted as a standalone package for reusability.

## Features

- 🚀 **Parse GEDCOM files** - Full GEDCOM 5.5.1 support
- 🔌 **Pluggable Architecture** - Zero dependencies on browser-specific APIs
- 💾 **Optional Caching** - Provide your own cache implementation (IndexedDB, localStorage, Redis, etc.)
- 🌍 **Optional Place Matching** - Provide your own country/place data
- 🏗️ **TypeScript** - Full type definitions included
- 🪶 **Lightweight** - Core package has minimal dependencies
- 🔒 **SSR-Safe** - No-op defaults for server-side rendering

## Installation

```bash
npm install @treeviz/gedcom-parser
```

## Quick Start

### Basic Usage (No Plugins)

```typescript
import { GedcomTree } from '@treeviz/gedcom-parser';

const gedcomContent = `0 HEAD
1 SOUR MyApp
0 @I1@ INDI
1 NAME John /Doe/
0 TRLR`;

const tree = new GedcomTree(gedcomContent);
const individuals = tree.indis();

individuals.forEach(indi => {
  console.log(indi.name()); // "John Doe"
});
```

## Factory Providers

The package uses factory patterns to allow customization of core functionality. All factories are **optional** - the package provides sensible defaults.

### Available Factory Providers

#### 1. **i18n Provider** (Translation)

Provide your translation function for date formatting and other localized content.

```typescript
import { setI18nProvider } from '@treeviz/gedcom-parser';
import i18n from './my-i18n-setup';

// Set up translation provider
setI18nProvider((key: string, options?: Record<string, unknown>) => 
  i18n.t(key, options)
);
```

**Default:** Returns the key as-is (no translation)

---

#### 2. **Date Locale Provider**

Provide date-fns locale for date formatting.

```typescript
import { setDateLocaleProvider } from '@treeviz/gedcom-parser';
import { enUS, hu, de } from 'date-fns/locale';

// Set up date locale provider
setDateLocaleProvider((lang: string) => {
  switch (lang) {
    case 'hu': return hu;
    case 'de': return de;
    default: return enUS;
  }
});
```

**Default:** English (en-US) locale

---

#### 3. **Place Parser Provider**

Provide custom place parsing logic for sophisticated place name recognition.

```typescript
import { setPlaceParserProvider } from '@treeviz/gedcom-parser';
import type { PlaceParts } from '@treeviz/gedcom-parser';

// Custom place parser with historical place recognition
setPlaceParserProvider((place: string | (string | undefined)[]) => {
  // Your sophisticated place parsing logic
  // e.g., recognize counties, historical boundaries, etc.
  return [{
    leftParts: ['District'],
    town: 'Budapest',
    county: 'Pest',
    country: 'Hungary'
  }] as PlaceParts[];
});
```

**Default:** Simple comma-split parser (last part = country, second-to-last = county, rest = town)

---

#### 4. **Place Translator Provider**

Provide custom place name translation and normalization.

```typescript
import { setPlaceTranslatorProvider } from '@treeviz/gedcom-parser';

// Custom place translator with country name translation
setPlaceTranslatorProvider((
  place?: string | string[], 
  level?: number, 
  toReversed?: boolean
) => {
  // Your translation logic
  // e.g., "Magyarország" → "Hungary", "Románia" → "Romania"
  return translatedPlace;
});
```

**Default:** Returns place name as-is (no translation)

---

#### 5. **Cache Manager Factory**

Provide your own caching implementation (IndexedDB, localStorage, Redis, etc.).

```typescript
import { setCacheManagerFactory } from '@treeviz/gedcom-parser';
import type { CacheManagerFactory } from '@treeviz/gedcom-parser';

const cacheFactory: CacheManagerFactory = <T>(
  name: string,
  store: string,
  type: string,
  encrypted: boolean
) => {
  // Return cache manager instance
  return {
    async getItem(): Promise<T | null> {
      // Your cache get logic
    },
    async setItem(value: T): Promise<void> {
      // Your cache set logic
    },
    async removeItem(): Promise<void> {
      // Your cache remove logic
    }
  };
};

setCacheManagerFactory(cacheFactory);
```

**Default:** In-memory cache (suitable for Node.js, testing, or small trees)

---

#### 6. **Kinship Translator Class**

Override the kinship relationship translator.

```typescript
import { setKinshipTranslatorClass, KinshipTranslator } from '@treeviz/gedcom-parser';

// Extend built-in translator
class MyCustomTranslator extends KinshipTranslator {
  translate(showMainPerson: boolean) {
    const result = super.translate(showMainPerson);
    return result ? `Custom: ${result}` : result;
  }
}

setKinshipTranslatorClass(MyCustomTranslator);
```

**Default:** Built-in multi-language translator (EN, HU, DE, ES, FR)

---

### Complete Setup Example

```typescript
import {
  setI18nProvider,
  setDateLocaleProvider,
  setPlaceParserProvider,
  setPlaceTranslatorProvider,
  setCacheManagerFactory,
  GedcomTree
} from '@treeviz/gedcom-parser';

// 1. Set up all factories BEFORE parsing
setI18nProvider((key, options) => i18n.t(key, options));
setDateLocaleProvider(getDateFnsLocale);
setPlaceParserProvider(getPlaceParts);
setPlaceTranslatorProvider(placeTranslator);
setCacheManagerFactory(cacheFactory);

// 2. Now parse GEDCOM
const tree = new GedcomTree(gedcomContent);

// All functionality now uses your custom implementations
```

---

## Advanced Examples

### With Caching (IndexedDB Example)

```typescript
import { setCacheFactory, type ICacheManager } from '@treeviz/gedcom-parser';
import localforage from 'localforage';

// Create your cache implementation
class IndexedDbCache<T> implements ICacheManager<T> {
  private store: LocalForage;
  
  constructor(name: string, storeName: string, enc?: boolean) {
    this.store = localforage.createInstance({ name, storeName });
  }
  
  async getItem(key: string): Promise<T | null> {
    return this.store.getItem<T>(key);
  }
  
  async setItem(key: string, value: T): Promise<void> {
    await this.store.setItem(key, value);
  }
  
  clear(): void {
    this.store.clear();
  }
  
  async clearBy(comparer: (key: string) => boolean): Promise<void> {
    await this.store.iterate((value, key) => {
      if (comparer(key)) {
        this.store.removeItem(key);
      }
    });
  }
  
  async clearCache(): Promise<void> {
    // Clear in-memory cache if applicable
  }
  
  async getAllItems(): Promise<Record<string, () => Promise<T>>> {
    const items: Record<string, () => Promise<T>> = {};
    await this.store.iterate((value, key) => {
      items[key] = async () => value as T;
    });
    return items;
  }
}

// Initialize the factory BEFORE using the parser
setCacheFactory((name, storeName, dataType, enc) => 
  new IndexedDbCache(name, `${storeName}-${dataType}`, enc)
);

// Now caching is enabled for path calculations and relatives
const tree = new GedcomTree(gedcomContent);
```

---

## API Reference

### Parser

#### `GedcomTree`

Main parser class for GEDCOM content.

```typescript
import { GedcomTree } from '@treeviz/gedcom-parser';

const tree = new GedcomTree(gedcomContent, options?);
```

**Methods:**
- `indis()` - Get all individuals (Individuals collection)
- `fams()` - Get all families (Families collection)
- `sours()` - Get all sources
- `repos()` - Get all repositories
- `objes()` - Get all media objects
- `subms()` - Get all submitters
- `indi(id)` - Get individual by ID
- `fam(id)` - Get family by ID

**Individual Methods:**
- `name()` - Get formatted name
- `birthDate()` - Get birth date
- `birthPlace()` - Get birth place
- `deathDate()` - Get death date
- `deathPlace()` - Get death place
- `parents()` - Get parent individuals
- `children()` - Get children
- `spouses()` - Get spouses
- `siblings()` - Get siblings
- And many more...

### Cache Manager

#### `setCacheManagerFactory(factory)`

Set up caching for performance optimization.

```typescript
import { setCacheManagerFactory, type CacheManagerFactory } from '@treeviz/gedcom-parser';

const factory: CacheManagerFactory = <T>(name: string, store: string, type: string, encrypted: boolean) => {
  // Return your cache manager implementation
  return {
    async getItem(): Promise<T | null> { /* ... */ },
    async setItem(value: T): Promise<void> { /* ... */ },
    async removeItem(): Promise<void> { /* ... */ }
  };
};

setCacheManagerFactory(factory);
```

**Cache Manager Interface:**

```typescript
interface ICacheManager<T> {
  /** Get an item from cache */
  getItem(): Promise<T | null>;
  
  /** Set an item in cache */
  setItem(value: T): Promise<void>;
  
  /** Remove item from cache */
  removeItem(): Promise<void>;
}
```

**What gets cached:**
- Path calculations between individuals (family tree traversal)
- Relatives queries (all relatives at N degrees)
- Kinship translations

**When to use caching:**
- ✅ Large GEDCOM files (>10MB or >5000 individuals)
- ✅ Repeated path calculations
- ✅ Multiple relatives queries
- ✅ Interactive family tree applications

**When NOT to use caching:**
- ❌ Server-side rendering (use no-op default)
- ❌ Simple/small GEDCOM files
- ❌ Memory-constrained environments
- ❌ One-time parsing tasks

---

### Factory Providers API Reference

#### `setI18nProvider(provider)`

Provide translation function for localized content.

```typescript
import { setI18nProvider, type I18nProvider } from '@treeviz/gedcom-parser';

const provider: I18nProvider = (key: string, options?: Record<string, unknown>) => {
  // Return translated string
  return myI18n.t(key, options);
};

setI18nProvider(provider);
```

---

#### `setDateLocaleProvider(provider)`

Provide date-fns locale for date formatting.

```typescript
import { setDateLocaleProvider, type DateLocaleProvider } from '@treeviz/gedcom-parser';
import { enUS, hu } from 'date-fns/locale';

const provider: DateLocaleProvider = (lang: string) => {
  return lang === 'hu' ? hu : enUS;
};

setDateLocaleProvider(provider);
```

---

#### `setPlaceParserProvider(provider)`

Provide custom place parsing logic.

```typescript
import { setPlaceParserProvider, type PlaceParserFunction } from '@treeviz/gedcom-parser';

const provider: PlaceParserFunction = (place: string | (string | undefined)[]) => {
  // Return parsed place parts
  return [{
    leftParts: [],
    town: 'Budapest',
    county: 'Pest',
    country: 'Hungary'
  }];
};

setPlaceParserProvider(provider);
```

---

#### `setPlaceTranslatorProvider(provider)`

Provide custom place name translation.

```typescript
import { setPlaceTranslatorProvider, type PlaceTranslatorFunction } from '@treeviz/gedcom-parser';

const provider: PlaceTranslatorFunction = (
  place?: string | string[], 
  level?: number, 
  toReversed?: boolean
) => {
  // Return translated place name
  return translatedPlace;
};

setPlaceTranslatorProvider(provider);
```

---

#### `setKinshipTranslatorClass(translatorClass)`

Override the kinship relationship translator.

```typescript
import { setKinshipTranslatorClass, KinshipTranslator } from '@treeviz/gedcom-parser';

class MyTranslator extends KinshipTranslator {
  translate(showMainPerson: boolean): string | undefined {
    const result = super.translate(showMainPerson);
    return result ? `Custom: ${result}` : result;
  }
}

setKinshipTranslatorClass(MyTranslator);
```

---

#### Reset Functions

All providers have corresponding reset functions to restore defaults:

```typescript
import {
  resetI18nProvider,
  resetDateLocaleProvider,
  resetPlaceParserProvider,
  resetPlaceTranslatorProvider,
  resetCacheManagerFactory,
  resetKinshipTranslatorClass
} from '@treeviz/gedcom-parser';

// Reset individual providers
resetI18nProvider();
resetDateLocaleProvider();
resetPlaceParserProvider();
resetPlaceTranslatorProvider();
resetCacheManagerFactory();
resetKinshipTranslatorClass();
```

---

### Country Data Provider (Deprecated)

#### `setCountryDataProvider(provider)`

⚠️ **Deprecated:** Use `setPlaceParserProvider` and `setPlaceTranslatorProvider` instead for better flexibility.

```typescript
import {
  clearBy(comparer: (key: string) => boolean): Promise<void>;
  
  /** Clear in-memory cache */
  clearCache(): Promise<void>;
  
  /** Get an item from cache */
  getItem(key: string): Promise<T | null>;
  
  /** Get all items as lazy-loaded promises */
  getAllItems(): Promise<Record<string, () => Promise<T>>>;
  
  /** Set an item in cache */
  setItem(key: string, value: T): Promise<void>;
}
```

**What gets cached:**
- Path calculations between individuals (family tree traversal)
- Relatives queries (all relatives at N degrees)

**When to use caching:**
- ✅ Large GEDCOM files (>10MB or >5000 individuals)
- ✅ Repeated path calculations
- ✅ Multiple relatives queries
- ✅ Interactive family tree applications

**When NOT to use caching:**
- ❌ Server-side rendering (use no-op default)
- ❌ Simple/small GEDCOM files
- ❌ Memory-constrained environments
- ❌ One-time parsing tasks

### Country Data Provider

#### `setCountryDataProvider(provider)`

Set up place matching and country/town data.

```typescript
import { 
  setCountryDataProvider, 
  type ICountryDataProvider 
} from '@treeviz/gedcom-parser';

const provider: ICountryDataProvider = {
  translations: {
    [languageCode]: { countryName: translation }
  },
  countries: {
    [countryCode]: {
      counties: { countyId: countyName },
      towns: {
        [year]: {
          _source: { en: 'Source Name', hu: 'Forrás Név' },
          _year: 1913,
          data: { /* town data */ }
        }
      }
    }
  }
};

setCountryDataProvider(provider);
```

**Helper Functions:**
```typescript
// Get country translations for a specific language
getCountryTranslations(languageCode: string): CountryTranslations;

// Get country data by country code
getCountryData(countryCode: string): CountryData | undefined;

// List all supported countries
getAvailableCountries(): string[];

// List all available translations
getAvailableLanguages(): string[];
```

### Settings & Types

#### `Settings`

Configuration for parser behavior.

```typescript
import { type Settings } from '@treeviz/gedcom-parser';

interface Settings {
  nameOrder?: NameOrder; // 'FIRST_LAST' | 'LAST_FIRST'
  placeOrder?: PlaceOrder; // 'HIERARCHICAL' | 'REVERSE'
  dateFormatPattern?: string; // Date format pattern
  linkedPersons?: LinkedPersons; // How to link related personsname
  // ... other settings
}
```

#### `Order`, `Filter`, `Group`

Utilities for sorting, filtering, and grouping individuals.

```typescript
import { type Order, type Filter, type Group } from '@treeviz/gedcom-parser';

// Order individuals by birth date
const byBirthDate: Order = {
  'BIRT.DATE': { 
    direction: 'ASC', 
    getter: (value, raw) => value 
  }
};

// Filter individuals born after 1900
const bornAfter1900: Filter = {
  'BIRT.DATE': { 
    comparer: (value) => {
      const year = new Date(value).getFullYear();
      return year > 1900;
    }
  }
};

// Group individuals by birth place
const byBirthPlace: Group = {
  'BIRT.PLAC': { 
    getter: (value) => value || 'Unknown' 
  }
};

// Use them
const individuals = tree.indis();
const ordered = individuals.order(byBirthDate);
const filtered = individuals.filter(bornAfter1900);
const grouped = individuals.group(byBirthPlace);
```

## Architecture

### Pluggable Design Philosophy

The package uses a **pluggable architecture** to avoid browser-specific dependencies:

```
┌─────────────────────────────────────┐
│   @treeviz/gedcom-parser (Core)     │
│   - Pure parsing logic               │
│   - Type definitions                 │
│   - No browser dependencies          │
└──────────────┬──────────────────────┘
               │
               │ Interfaces
               │
┌──────────────┴──────────────────────┐
│   Consumer Application               │
│   - Provides ICacheManager           │
│   - Provides ICountryDataProvider    │
│   - Controls implementation          │
└─────────────────────────────────────┘
```

**Benefits:**
- ✅ Works in any environment (browser, Node.js, React Native, Electron, etc.)
- ✅ No bundling of unused code (tree-shakeable)
- ✅ Consumer controls all implementation details
- ✅ Lightweight package size
- ✅ Easy to test (mock implementations)
- ✅ Flexible backend choices

### Performance Optimization

**Without caching:**
- Path between distant relatives: ~500-1000ms
- All relatives at 5 degrees: ~2-5 seconds
- Repeated queries: Same time every time

**With caching:**
- Path between distant relatives: ~10-50ms (10-20x faster)
- All relatives at 5 degrees: ~100-500ms (10-20x faster)
- Repeated queries: Near instant (cache hit)

**Memory usage:**
- Core parser: ~5-10MB for typical GEDCOM
- With cache: +10-50MB depending on cache size
- Without cache: No additional memory

## Complete Examples

### Full React Application Setup

```typescript
// src/utils/gedcom-init.ts
import { 
  setCacheFactory, 
  setCountryDataProvider,
  type ICacheManager 
} from '@treeviz/gedcom-parser';
import localforage from 'localforage';

// Import your data files
import huCountries from '../data/hu-countries.json';
import enCountries from '../data/en-countries.json';
import huCounties from '../data/hungary/counties.json';
import huTowns2020 from '../data/hungary/towns-2020.json';

// Cache implementation
class IndexedDbCache<T> implements ICacheManager<T> {
  private store: LocalForage;
  
  constructor(name: string, storeName: string, enc?: boolean) {
    this.store = localforage.createInstance({ 
      name, 
      storeName,
      driver: localforage.INDEXEDDB 
    });
  }
  
  clear(): void {
    this.store.clear();
  }
  
  async clearBy(comparer: (key: string) => boolean): Promise<void> {
    await this.store.iterate((value, key) => {
      if (comparer(key)) {
        this.store.removeItem(key);
      }
    });
  }
  
  async clearCache(): Promise<void> {
    // Optional: clear in-memory cache
  }
  
  async getItem(key: string): Promise<T | null> {
    return this.store.getItem<T>(key);
  }
  
  async getAllItems(): Promise<Record<string, () => Promise<T>>> {
    const items: Record<string, () => Promise<T>> = {};
    await this.store.iterate((value, key) => {
      items[key] = async () => value as T;
    });
    return items;
  }
  
  async setItem(key: string, value: T): Promise<void> {
    await this.store.setItem(key, value);
  }
}

// Initialize gedcom-parser
export function initGedcomParser() {
  // Set up caching
  setCacheFactory((name, storeName, dataType, enc) => 
    new IndexedDbCache(name, `${storeName}-${dataType}`, enc)
  );
  
  // Set up country data
  setCountryDataProvider({
    translations: {
      hu: huCountries,
      en: enCountries,
    },
    countries: {
      HU: {
        counties: huCounties,
        towns: {
          '2020': {
            _source: { en: 'Hungary 2020', hu: 'Magyarország 2020' },
            _year: 2020,
            data: huTowns2020,
          },
        },
      },
    },
  });
}

// Call this in your app initialization
// src/index.tsx
import { initGedcomParser } from './utils/gedcom-init';

initGedcomParser();

// Now you can use the parser anywhere
import { GedcomTree } from '@treeviz/gedcom-parser';

function parseGedcom(content: string) {
  const tree = new GedcomTree(content);
  return tree.indis();
}
```

### Order, Filter, Group Example

```typescript
import { GedcomTree, type Order, type Filter, type Group } from '@treeviz/gedcom-parser';

const tree = new GedcomTree(gedcomContent);
const individuals = tree.indis();

// 1. Order by birth date (oldest first)
const byBirthDateAsc: Order = {
  'BIRT.DATE': { 
    direction: 'ASC', 
    getter: (value) => new Date(value).getTime() 
  }
};

const orderedByBirth = individuals.order(byBirthDateAsc);

// 2. Filter born in 20th century
const born20thCentury: Filter = {
  'BIRT.DATE': {
    comparer: (date) => {
      const year = new Date(date).getFullYear();
      return year >= 1900 && year < 2000;
    }
  }
};

const filtered20thCentury = individuals.filter(born20thCentury);

// 3. Group by birth place
const byBirthPlace: Group = {
  'BIRT.PLAC': { 
    getter: (place) => place || 'Unknown' 
  }
};

const groupedByPlace = individuals.group(byBirthPlace);

// Print results
groupedByPlace.forEach((group, place) => {
  console.log(`Born in ${place}:`);
  group.forEach(indi => {
    console.log(`  - ${indi.name()}`);
  });
});

// 4. Combine: Filter + Order + Group
const males born20thInBudapest = individuals
  .filter(born20thCentury)
  .filter({ 'BIRT.PLAC': { comparer: (place) => place?.includes('Budapest') } })
  .filter({ 'SEX': { comparer: (sex) => sex === 'M' } })
  .order(byBirthDateAsc);
```

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
// Import types
import type {
  // Core
  Settings,
  Order,
  OrderDefinition,
  Filter,
  Group,
  
  // Pluggable interfaces
  ICacheManager,
  CacheFactory,
  ICountryDataProvider,
  CountryTranslations,
  CountryData,
  
  // Date & Event structures
  CommonDate,
  IDateStructure,
  IEventDetailStructure,
  
  // Class interfaces
  GedComInterface,
  IndiInterface,
  FamInterface,
  
  // And many more...
} from '@treeviz/gedcom-parser';
```

## Legacy Compatibility

For backward compatibility, the package exports legacy names:

```typescript
// Old names (still work)
import { 
  setIndexedDbFactory,  // ← Same as setCacheFactory
  type IIndexedDbManager, // ← Same as ICacheManager
  type IndexedDbFactory   // ← Same as CacheFactory
} from '@treeviz/gedcom-parser';

// New names (recommended)
import { 
  setCacheFactory,
  type ICacheManager,
  type CacheFactory
} from '@treeviz/gedcom-parser';
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (use transpilation)

## Node.js Compatibility

- Node.js 14+: ✅ Full support
- Recommended: Node.js 18+ (LTS)

**Note:** When using in Node.js, don't set up browser-specific plugins (IndexedDB). The package works fine with no-op defaults.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

### Development Setup

```bash
# Clone repository
git clone https://github.com/idavidka/gedcom-parser.git
cd gedcom-parser

# Install dependencies
npm install

# Build
npm run build

# Run tests (if available)
npm test
```

## Support

- **Issues**: [GitHub Issues](https://github.com/idavidka/gedcom-parser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/idavidka/gedcom-parser/discussions)
- **Main App**: [TreeViz](https://treeviz.com)

## Credits

Originally developed as part of **TreeViz** by [@idavidka](https://github.com/idavidka).

Special thanks to all contributors and the genealogy community.
