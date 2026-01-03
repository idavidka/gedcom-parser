# Pluggable Dependencies Guide

The `gedcom-parser` package provides several pluggable dependencies that can be customized by the consuming project. This allows you to inject your own implementations without modifying the package code.

## Cache Manager Factory

The cache manager is used for caching path calculations and relatives data. By default, it uses an in-memory cache, but you can inject a custom implementation (e.g., IndexedDB).

### Interface

```typescript
export interface ICacheManager<T> {
  getItem: () => Promise<T | null>;
  setItem: (value: T) => Promise<void>;
}

export type CacheManagerFactory = <T>(
  name: string,
  store: string,
  type: string,
  encrypted: boolean
) => ICacheManager<T>;
```

### Usage

```typescript
import { setCacheManagerFactory } from '@treeviz/gedcom-parser';
import { getInstance } from './utils/indexed-db-manager';

// Inject your custom cache implementation
setCacheManagerFactory(getInstance);
```

### Example Custom Implementation

```typescript
import { ICacheManager } from '@treeviz/gedcom-parser';

const createIndexedDBCache = <T>(
  name: string,
  store: string,
  type: string,
  encrypted: boolean
): ICacheManager<T> => {
  // Your IndexedDB implementation
  return {
    getItem: async () => {
      // Retrieve from IndexedDB
      return await db.get(store, type);
    },
    setItem: async (value: T) => {
      // Store in IndexedDB
      await db.put(store, type, value);
    },
  };
};

setCacheManagerFactory(createIndexedDBCache);
```

### Reset to Default

```typescript
import { resetCacheManagerFactory } from '@treeviz/gedcom-parser';

// Reset to in-memory cache
resetCacheManagerFactory();
```

---

## Kinship Translator Factory

The kinship translator converts family relationships into human-readable text (e.g., "grandmother", "second cousin"). The built-in translator supports multiple languages (EN, HU, DE, ES, FR), but you can override it with your own implementation.

### Interface

```typescript
export type KinshipTranslatorConstructor = new (
  person1: IndiType,
  person2?: IndiType | IndiKey,
  lang?: Language,
  entirePath?: boolean,
  displayName?: "none" | "givenname" | "surname" | "all"
) => {
  translate: <T extends boolean | undefined>(
    showMainPerson: boolean
  ) =>
    | (T extends false | undefined
        ? string
        : Array<{
            id?: IndiKey;
            gen: number;
            relative?: string;
            absolute?: string;
          }>)
    | undefined;
};
```

### Usage

```typescript
import { setKinshipTranslatorClass, KinshipTranslator } from '@treeviz/gedcom-parser';

// Use the built-in translator (default)
// No need to call setKinshipTranslatorClass unless you want to override

// Override with your custom implementation
class MyCustomKinshipTranslator {
  constructor(person1, person2, lang, entirePath, displayName) {
    // Your custom initialization
  }

  translate(showMainPerson) {
    // Your custom translation logic
    return "custom relationship text";
  }
}

setKinshipTranslatorClass(MyCustomKinshipTranslator);
```

### Extending the Built-in Translator

```typescript
import { setKinshipTranslatorClass, KinshipTranslator } from '@treeviz/gedcom-parser';

class ExtendedKinshipTranslator extends KinshipTranslator {
  translate(showMainPerson) {
    // Add custom logic
    const result = super.translate(showMainPerson);
    
    // Modify or enhance the result
    return result ? `${result} (extended)` : result;
  }
}

setKinshipTranslatorClass(ExtendedKinshipTranslator);
```

### Reset to Default

```typescript
import { resetKinshipTranslatorClass } from '@treeviz/gedcom-parser';

// Reset to built-in translator
resetKinshipTranslatorClass();
```

---

## Best Practices

### 1. Initialize Early

Set up your factories **before** creating any `GedcomTree` instances:

```typescript
import { setCacheManagerFactory, setKinshipTranslatorClass } from '@treeviz/gedcom-parser';
import { getInstance } from './utils/indexed-db-manager';
import MyCustomKinshipTranslator from './translators/custom-kinship';

// Set up factories first
setCacheManagerFactory(getInstance);
setKinshipTranslatorClass(MyCustomKinshipTranslator);

// Then use the parser
import GedcomTree from '@treeviz/gedcom-parser';
const gedcom = GedcomTree.parse(gedcomString);
```

### 2. Test with Default Implementations

The default implementations (in-memory cache, built-in translator) are useful for:
- Unit testing
- Environments without IndexedDB support (Node.js)
- Quick prototyping

### 3. Reset in Tests

Always reset factories in your test teardown to avoid side effects:

```typescript
import { resetCacheManagerFactory, resetKinshipTranslatorClass } from '@treeviz/gedcom-parser';

afterEach(() => {
  resetCacheManagerFactory();
  resetKinshipTranslatorClass();
});
```

### 4. Type Safety

The factories are fully typed, so TypeScript will catch implementation errors:

```typescript
// ✅ Correct
const cache: ICacheManager<MyData> = {
  getItem: async () => myData,
  setItem: async (value) => { /* ... */ },
};

// ❌ TypeScript error - missing methods
const badCache = {
  getItem: async () => myData,
  // Missing setItem!
};
```

---

## Examples

### Complete Setup Example

```typescript
// setup-gedcom-parser.ts
import {
  setCacheManagerFactory,
  setKinshipTranslatorClass,
  type ICacheManager,
} from '@treeviz/gedcom-parser';

// Custom cache implementation
export const setupCache = () => {
  const createCache = <T>(name: string, store: string, type: string, encrypted: boolean): ICacheManager<T> => {
    const db = openIndexedDB(name);
    
    return {
      getItem: async () => {
        const tx = db.transaction(store, 'readonly');
        const objectStore = tx.objectStore(store);
        const request = objectStore.get(type);
        return new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result || null);
        });
      },
      setItem: async (value: T) => {
        const tx = db.transaction(store, 'readwrite');
        const objectStore = tx.objectStore(store);
        objectStore.put(value, type);
        return new Promise((resolve) => {
          tx.oncomplete = () => resolve();
        });
      },
    };
  };
  
  setCacheManagerFactory(createCache);
};

// Use built-in translator (or customize as needed)
export const setupTranslator = () => {
  // Using default built-in translator - no need to call anything
  // Or override:
  // setKinshipTranslatorClass(MyCustomTranslator);
};

// Initialize everything
export const initializeGedcomParser = () => {
  setupCache();
  setupTranslator();
};
```

```typescript
// main.ts
import { initializeGedcomParser } from './setup-gedcom-parser';
import GedcomTree from '@treeviz/gedcom-parser';

// Initialize once at app startup
initializeGedcomParser();

// Now use the parser with custom implementations
const gedcom = GedcomTree.parse(gedcomString);
const person = gedcom.indi('@I1@');
const kinship = person?.kinship('@I2@', true, 'en');
console.log(kinship); // Uses your custom translator and caches with IndexedDB
```

---

## Migration from Old API

If you're migrating from an older version where dependencies were hardcoded:

### Before (Old API)
```typescript
// Dependencies were hardcoded in the package
import GedcomTree from '@treeviz/gedcom-parser';
```

### After (New Pluggable API)
```typescript
// Inject your dependencies first
import { setCacheManagerFactory } from '@treeviz/gedcom-parser';
import { getInstance } from './utils/indexed-db-manager';

setCacheManagerFactory(getInstance);

// Then use normally
import GedcomTree from '@treeviz/gedcom-parser';
```

---

## Troubleshooting

### Cache Not Working
- Ensure `setCacheManagerFactory` is called **before** parsing
- Check that your cache implementation returns `Promise<T | null>` from `getItem`
- Verify IndexedDB is available in your environment

### Kinship Translation Issues
- Check that the `lang` parameter matches supported languages: `"en" | "hu" | "de" | "es" | "fr"`
- Ensure custom translator implements the correct interface
- Use built-in translator as reference implementation

### TypeScript Errors
- Import types from the package: `import type { ICacheManager } from '@treeviz/gedcom-parser'`
- Ensure your implementations match the exact interface signatures
- Check that generic types (`<T>`) are properly handled
