# @treeviz/gedcom-parser

> Part of the [@treeviz](https://www.npmjs.com/org/treeviz) organization — tools for genealogy data processing and visualization.

A pluggable GEDCOM parser for JavaScript/TypeScript. Originally part of [TreeViz](https://treeviz.com), published as a standalone package.

## Features

- **Parse** GEDCOM 5.5 / 5.5.1 and GEDCOM 7 (legacy `CONC` is folded on import)
- **Export** as GEDCOM **5.5.1** or **7.0**
- **GEDZIP** — build / extract FamilySearch `.gdz` (`toGedzip`, `extractGedzip`, `buildGedzip`, `buildGedzipBlob`, `downloadGedzipMedia`)
- **Multimedia** — create / attach OBJE; G7 uses nested `FILE → FORM [→ TYPE]`
- **GEDCOM 7 extras** — `SNOTE`, `NO` (non-event), `SCHMA`, `UID` / `CREA` / `CHAN`, `PHRASE` for non-enum values, calendars / date periods
- **Original source head** — `_ORIGHEAD` preserved for vendor detection (`getOriginalHeadRecord`, `getSourceHeads`)
- **Local media hooks** — inject IndexedDB / host storage for `media/...` paths without coupling the parser to the browser
- **CLI** — `info`, `find`, `show`, `get`, `open`, `validate`, `relatives`, `extract`, `stats`, `merge`, `convert`
- **Pluggable** — i18n, date locale, places, cache, kinship (no hard dependency on IndexedDB)
- **TypeScript** — full type definitions
- **SSR-safe** defaults when factories are unset

> **Export version priority:** `toGedcom(..., { gedcomVersion })` → else source `HEAD.GEDC.VERS` → else **5.5.1**.  
> GEDCOM 7 transforms (PHRASE, SCHMA, UID/CREA/CHAN backfill, CONC omission, …) run **only** when the resolved export version is `7.0`.
>
> Extension tags in `HEAD.SCHMA` are documented at [treeviz.com/gedcom](https://treeviz.com/gedcom) (e.g. `#_ORIGHEAD`).

**Dependencies:** `lodash-es`, `date-fns`, `jszip` (GEDZIP), plus CLI-only `commander` / `chalk`. Core parsing does not require a browser.

## Installation

```bash
npm install @treeviz/gedcom-parser
```

Requires **Node.js 20+** (see `engines` in `package.json`).

## Quick Start

```typescript
import GedcomTree from '@treeviz/gedcom-parser';

const { gedcom } = GedcomTree.parse(`0 HEAD
1 SOUR MyApp
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME John /Doe/
0 TRLR`);

gedcom.indis()?.forEach((indi) => {
  console.log(indi?.toName());
  console.log(indi?.getBirthDate?.());
  console.log(indi?.getBirthPlace?.());
});
```

### Export 5.5.1 vs 7.0

```typescript
// Explicit GEDCOM 7
const ged7 = gedcom.toGedcom(undefined, 0, { gedcomVersion: '7.0' });

// Explicit 5.5.1 (no G7 transforms)
const ged551 = gedcom.toGedcom(undefined, 0, { gedcomVersion: '5.5.1' });

// Omit gedcomVersion → use HEAD.GEDC.VERS, else 5.5.1
const auto = gedcom.toGedcom();
```

### GEDZIP (`.gdz`)

```typescript
import {
  extractGedzip,
  buildGedzipBlob,
  downloadGedzipMedia,
  setMediaContentResolver,
} from '@treeviz/gedcom-parser';

// Import archive → GEDCOM text + media bytes
const { gedcomText, mediaEntries } = await extractGedzip(file);

// Export: collect descriptors, resolve bytes (host cache / fetch), pack Blob
setMediaContentResolver(async (media) => {
  // e.g. look up IndexedDB by media.url / media.imgId
  return undefined; // fall through to fetch for http(s)
});

const media = await gedcom.collectMultimedia({ namespace: spaceId });
const downloaded = await downloadGedzipMedia(media);
const blob = await buildGedzipBlob(
  gedcom.toGedcom(undefined, 0, { gedcomVersion: '7.0' }) || '',
  downloaded
);
```

Or use `gedcom.toGedzip({ media: downloaded })` when you already have byte payloads.

### Local / cached media paths

After GEDZIP import, `FILE` payloads often look like `media/uuid.jpg`. Inject resolvers so profile pictures and export can turn those into data URLs:

```typescript
import {
  setLocalMediaResolver,
  setMediaContentResolver,
} from '@treeviz/gedcom-parser';

setLocalMediaResolver(async (path) => {
  // Return a data:/blob:/https: URL for display
  return await myImageStore.get(path);
});

setMediaContentResolver(async (media) => {
  // Return { content, contentType? } for GEDZIP export
  const hit = await myImageStore.get(media.url || media.imgId);
  return hit ? { content: hit } : undefined;
});
```

## Command-Line Interface

```bash
npm install -g @treeviz/gedcom-parser
# or
npx @treeviz/gedcom-parser --help
```

| Command | Purpose |
| --- | --- |
| `info <file>` | File statistics (`--verbose`, `--json`) |
| `find <file> [query]` | Search individuals |
| `show <file> <id>` | Individual details |
| `get <file> <id>` | Value by path (`--path BIRT.DATE`) |
| `select <file> <id>` | Select record helpers |
| `open <file>` | Interactive REPL |
| `validate <file>` | Validation |
| `relatives <file> <id>` | Ancestors / descendants / subtree |
| `extract <file>` | Filtered subset GEDCOM |
| `stats <file>` | Statistics |
| `merge <files...>` | Merge GEDCOMs |
| `convert <file>` | JSON / CSV / Markdown |

```bash
gedcom-parser info family.ged --verbose
gedcom-parser find family.ged "John Smith"
gedcom-parser show family.ged @I123@
gedcom-parser relatives family.ged @I123@ --tree --output subset.ged
gedcom-parser open family.ged
```

## Factory Providers

All factories are **optional**. Set them **before** parsing if you need localization, places, or durable cache.

### 1. i18n

```typescript
import { setI18nProvider } from '@treeviz/gedcom-parser';

setI18nProvider((key, options) => i18n.t(key, options));
```

**Default:** returns the key unchanged.

### 2. Date locale (`date-fns`)

```typescript
import { setDateLocaleProvider } from '@treeviz/gedcom-parser';
import { hu } from 'date-fns/locale';

// No language argument — return the locale for the *current* app language
setDateLocaleProvider(() => hu);
```

**Default:** `undefined` (date-fns default behavior).

### 3. Place parser

```typescript
import { setPlaceParserProvider } from '@treeviz/gedcom-parser';
import type { PlaceParts } from '@treeviz/gedcom-parser';

setPlaceParserProvider((place) => {
  // Return PlaceParts[]
  return [{ leftParts: [], town: 'Budapest', county: 'Pest', country: 'Hungary' }];
});
```

**Default:** simple comma-split heuristic.

### 4. Place translator

```typescript
import { setPlaceTranslatorProvider } from '@treeviz/gedcom-parser';

setPlaceTranslatorProvider((place, level, toReversed) => {
  return translatedPlace;
});
```

**Default:** identity.

### 5. Cache manager

Caches **whole objects** (not key/value maps). The host chooses the storage key inside the factory.

```typescript
import {
  setCacheManagerFactory,
  type CacheManagerFactory,
  type ICacheManager,
} from '@treeviz/gedcom-parser';

const factory: CacheManagerFactory = <T>(
  name: string,
  store: string,
  type: string,
  encrypted: boolean
): ICacheManager<T> => {
  const key = `gedcom_${name}_${store}_${type}`;
  return {
    async getItem() {
      return (await myDb.get(key)) as T | null;
    },
    async setItem(value: T) {
      await myDb.set(key, value);
    },
  };
};

setCacheManagerFactory(factory);
```

**Default:** in-memory single-slot cache.

**Cached today:** path calculations, relatives queries, profile-picture cache (when used).

### 6. Kinship translator class

```typescript
import { setKinshipTranslatorClass, KinshipTranslator } from '@treeviz/gedcom-parser';

class MyTranslator extends KinshipTranslator {
  translate(showMainPerson: boolean) {
    const result = super.translate(showMainPerson);
    return result ? `Custom: ${result}` : result;
  }
}

setKinshipTranslatorClass(MyTranslator);
```

### Reset helpers

```typescript
import {
  resetI18nProvider,
  resetDateLocaleProvider,
  resetPlaceParserProvider,
  resetPlaceTranslatorProvider,
  resetCacheManagerFactory,
  resetKinshipTranslatorClass,
} from '@treeviz/gedcom-parser';
```

### Minimal host setup (browser app)

```typescript
import {
  setI18nProvider,
  setDateLocaleProvider,
  setPlaceParserProvider,
  setPlaceTranslatorProvider,
  setCacheManagerFactory,
  setLocalMediaResolver,
  setMediaContentResolver,
  initializeCache,
  GedcomTree,
} from '@treeviz/gedcom-parser';

setI18nProvider((key, options) => i18n.t(key, options));
setDateLocaleProvider(getDateFnsLocale);
setPlaceParserProvider(getPlaceParts);
setPlaceTranslatorProvider(placeTranslator);
setCacheManagerFactory(bridgeToIndexedDb);
setLocalMediaResolver(resolveFromImageStore);
setMediaContentResolver(resolveContentFromImageStore);
await initializeCache();

const { gedcom } = GedcomTree.parse(content);
```

## API Overview

### `GedcomTree`

```typescript
import GedcomTree from '@treeviz/gedcom-parser';

const { gedcom, settings } = GedcomTree.parse(content, options?);
```

**On `gedcom`:**

| Method | Notes |
| --- | --- |
| `indis()` / `indi(id)` | Individuals |
| `fams()` / `fam(id)` | Families |
| `objes()` / `sours()` / `repos()` / `subms()` / `snotes()` | Other top-level records |
| `toGedcom(tag?, level?, options?)` | Serialize; `options.gedcomVersion`, `options.original`, media standardize |
| `toGedzip(options?)` | GEDCOM 7 text + media → `.gdz` bytes |
| `createMultimediaRecord(input)` | New OBJE |
| `collectMultimedia(options?)` | Merge `Indi.multimedia()` |
| `stats()` | Aggregate statistics |
| `getGedcomVersion()` | Normalized `5.5.1` \| `7.0` |
| `getOriginalHeadRecord()` | `_ORIGHEAD` if present |
| `getSourceHeads()` | Original head first, then live `HEAD` |
| `isAncestry()` / `isMyHeritage()` / … | Vendor detection (uses source heads) |

**On each individual (`indi`):**

- Names / dates / places: `toName()`, `getBirthDate()`, `getDeathDate()`, `getBirthPlace()`, …
- Relationships: parents, children, spouses, siblings, grandparents, cousins, in-laws, …
- Media: `multimedia(namespace?)`, `getProfilePicture(namespace?)`, `attachMultimedia()`, `attachMediaFromUrl()`
- Editing helpers: facts / non-events (`NO`), shared notes, FamilySearch markers, …

See TypeScript definitions under `classes/` and `interfaces/` for the full surface.

### GEDZIP utilities

```typescript
import {
  GEDZIP_MIME,
  GEDZIP_EXTENSION,
  extractGedzip,
  extractGedzipGedcom,
  buildGedzip,
  buildGedzipBlob,
  downloadGedzipMedia,
  remountGedzipMediaAsDataUrls,
  isGedzipContainer,
  rewriteGedcomFilePaths,
} from '@treeviz/gedcom-parser';
// or: '@treeviz/gedcom-parser/utils/gedzip'
```

### Order / filter / group

```typescript
import GedcomTree, { type Order, type Filter, type Group } from '@treeviz/gedcom-parser';

const individuals = GedcomTree.parse(content).gedcom.indis();

const byBirth: Order = {
  'BIRT.DATE': { direction: 'ASC', getter: (value) => value },
};

const after1900: Filter = {
  'BIRT.DATE': {
    comparer: (value) => Number(String(value).match(/\d{4}/)?.[0]) > 1900,
  },
};

individuals?.order(byBirth);
individuals?.filter(after1900);
```

## Architecture

```
┌──────────────────────────────────────┐
│  @treeviz/gedcom-parser              │
│  parse / export / GEDZIP / kinship   │
│  optional factories + media hooks    │
└──────────────────┬───────────────────┘
                   │ inject
┌──────────────────┴───────────────────┐
│  Host app (e.g. TreeViz)             │
│  IndexedDB, i18n, place DB, fetch    │
└──────────────────────────────────────┘
```

- Works in browser and Node (avoid browser-only factories on the server).
- Media storage stays in the host; the parser only calls injected resolvers.
- `_ORIGHEAD` keeps the pre-TreeViz `HEAD` so Ancestry / MyHeritage / FamilySearch detection still works after re-export.

## TypeScript

```typescript
import type {
  Settings,
  Order,
  Filter,
  Group,
  ICacheManager,
  CacheManagerFactory,
  I18nProvider,
  DateLocaleProvider,
  PlaceParserFunction,
  PlaceTranslatorFunction,
  LocalMediaResolver,
  MediaContentResolver,
  GedzipMediaInput,
} from '@treeviz/gedcom-parser';

import type { GedComType } from '@treeviz/gedcom-parser/classes';
import type { IndiType } from '@treeviz/gedcom-parser/classes';
```

## Compatibility

| Environment | Support |
| --- | --- |
| Modern Chromium / Firefox / Safari | ✅ |
| Node.js 20+ | ✅ |
| IE11 | ❌ |

## License

MIT

## Contributing

```bash
git clone https://github.com/idavidka/gedcom-parser.git
cd gedcom-parser
npm install
npm run build
npm test
```

## Support

- Issues: [GitHub Issues](https://github.com/idavidka/gedcom-parser/issues)
- Discussions: [GitHub Discussions](https://github.com/idavidka/gedcom-parser/discussions)
- App: [TreeViz](https://treeviz.com)

## Credits

Originally developed as part of **TreeViz** by [@idavidka](https://github.com/idavidka).
