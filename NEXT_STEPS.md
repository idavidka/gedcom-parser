# Next Steps for gedcom-parser

## Current Status

The gedcom-parser has been extracted from the main project with:
- ✅ Core type definitions (RelationType, PartnerType, Range, Filter, Order, Group, etc.)
- ✅ Settings interface (NameOrder, PlaceOrder, CurrentNameOfTown, LinkedPersons)
- ✅ Kinship-translator with all language implementations
- ✅ Basic utility files (cache, date-formatter, name-formatter, place-translator, etc.)
- ✅ Pluggable translation system (i18n.ts)
- ✅ Constants (filters, orders)
- ✅ Import fix script with 250+ replacement patterns
- ✅ TypeScript config relaxed (strict: false, ES2021/ES2023 libs)

**Current Build Status:** ❌ 70 TypeScript errors

---

## TODO: Fix Build Errors (70 errors remaining)

### 1. Fix Circular Imports ⚠️ CRITICAL

**Problem:** Many utils still import from `@treeviz/gedcom-parser` (circular dependency)

**Files affected:**
- `src/utils/cache.ts`
- `src/utils/date-formatter.ts`
- `src/utils/name-formatter.ts`
- `src/utils/get-places/index.ts`
- `src/constants/orders.ts`

**Solution:**
```typescript
// Change FROM:
import { type IndiType } from "@treeviz/gedcom-parser";

// TO:
import { type IndiType } from "../classes/indi";
```

**Action:** Update import fix script and run again on these files.

---

### 2. Copy Missing Utility Files

**Required files NOT yet copied:**
- `src/utils/common-creator.ts` - Used by parser.ts, name-formatter.ts
- `src/utils/get-all-prop.ts` - Used by date-formatter.ts
- `src/utils/indexed-db-manager.ts` - Used by cache.ts (or stub/remove)

**Optional/Consider:**
- Translation JSON files:
  - `src/translation/hu-countries.json`
  - `src/translation/de-countries.json`
  - `src/translation/fr-countries.json`
  - `src/translation/es-countries.json`
  - `src/translation/en-countries.json`
- Source data files:
  - `src/sources/hungary/counties.json`
  - `src/sources/hungary/towns-2020.json`
  - `src/sources/hungary/towns-1913.json`
  - `src/sources/hungary/towns-detailed.json`
  - `src/sources/austria/counties.json`
  - `src/sources/austria/towns-at-1910.json`
  - `src/sources/austria/towns-at-latest.json`
  - `src/sources/austria/towns-detailed.json`

**Decision needed:** Make translation/source data pluggable or copy them?

---

### 3. Add Missing Type Exports

**Add to `src/types.ts`:**
```typescript
export type ConvertType =
	| "FAM"
	| "INDI"
	| "_INDI"
	| "OBJE"
	| "SOUR"
	| "REPO"
	| "SUBM";
```

---

### 4. Fix Structures Imports

**Problem:** Files in `src/structures/*` still import from `../../classes/gedcom/classes/*`

**Files affected:**
- `src/structures/date.ts`
- `src/structures/individual.ts`
- `src/structures/note.ts`

**Solution:** Update imports to use `../classes/*` paths.

**Action:** Add patterns to import fix script:
```python
(r'from ["\']\.\.\/\.\.\/classes\/gedcom\/classes\/date["\']', 'from "../classes/date"'),
(r'from ["\']\.\.\/\.\.\/classes\/gedcom\/classes\/name["\']', 'from "../classes/name"'),
(r'from ["\']\.\.\/\.\.\/classes\/gedcom\/classes\/note["\']', 'from "../classes/note"'),
```

---

### 5. Fix `orders.ts` - `getFamilyWith` Dependency

**Problem:** `src/constants/orders.ts` uses `getFamilyWith()` which is not part of parser.

**Options:**
1. Copy `src/utils/get-family-with.ts` from main project
2. Comment out order functions that use it (SPOUSE_BIRTH_ASC, SPOUSE_BIRTH_DESC, etc.)
3. Make it optional/pluggable

**Affected order constants:**
- `SPOUSE_BIRTH_ASC` (line 277)
- `SPOUSE_BIRTH_DESC` (line 304)

---

### 6. Fix `parser.ts` - Missing Constants

**Problem:** `src/parser.ts` imports `MAX_FILE_SIZE_TO_SYNC` from constants, but it doesn't exist.

**Solution:**
```typescript
// In src/constants.ts - ADD:
export const MAX_FILE_SIZE_TO_SYNC = 5 * 1024 * 1024; // 5MB

// OR in src/parser.ts - REMOVE:
import {
	ID_GETTER_REG,
	ID_REG,
	LINE_REG,
	// MAX_FILE_SIZE_TO_SYNC, // REMOVE THIS
	REF_LINE_REG,
} from "./constants";
```

---

### 7. Fix `parser.ts` - Selectors Dependency

**Problem:** `src/parser.ts` imports `getRawSize` from `./utils/selectors` (doesn't exist).

**Options:**
1. Copy `getRawSize` function from main project
2. Remove dependency and inline the logic
3. Make it optional/pluggable

---

### 8. Fix Common Type Issues in `gedcom.ts`

**Problem:** TypeScript errors with List generic type usage.

**Files:**
- `src/classes/gedcom.ts:57` - Property 'item' does not exist on type 'MultiTag | L'
- `src/classes/gedcom.ts:81` - Property 'keys' does not exist on type 'MultiTag | L'

**Solution:** Review generic type constraints in List class.

---

### 9. Fix Type Issues in `indi.ts`

**Problem:** Missing `lastItems` property in IndiTree type.

**File:** `src/classes/indi.ts:229`

**Solution:** Add `lastItems: {}` to the initialized object.

---

## After Build Succeeds

### 10. Update Main Project Settings

**File:** `src/store/main/reducers.ts`

**Change:**
```typescript
// FROM:
export interface Settings {
	dateFormatPattern: string;
	nameOrder: NameOrder;
	// ... all fields
}

// TO:
import { Settings as GedcomSettings } from "@treeviz/gedcom-parser";

export interface Settings extends GedcomSettings {
	// Only app-specific fields:
	cloudSync: boolean;
	autoDownload: boolean;
	spaceId?: number;
	poolId?: number;
	pdfScale: number;
	individualSize: Size;
	horizontalSpace: number;
	// ... etc (visualization-specific settings)
}
```

---

### 11. Remove Moved Files from Main Project

**After gedcom-parser is fully working, DELETE from main project:**
- `src/utils/parser.ts` ❌
- `src/classes/gedcom/*` ❌ (entire directory)
- `src/types/structures/*` ❌ (entire directory)

**Keep these (app-specific):**
- `src/types/types.ts` ✅ (but remove parser-related types)
- `src/constants/constants.ts` ✅ (but remove parser-related constants)

---

### 12. Prepare for NPM Publish

**Update `package.json`:**
```json
{
  "name": "@treeviz/gedcom-parser",
  "version": "1.0.0",
  "description": "Standalone GEDCOM parser for genealogy applications with pluggable dependencies",
  "keywords": ["gedcom", "genealogy", "parser", "family-tree"],
  "repository": {
    "type": "git",
    "url": "https://github.com/idavidka/gedcom-parser.git"
  },
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

**Update `src/index.ts`:**
```typescript
// Export pluggable functions
export { setTranslationFunction, setLanguage, getLanguage, t } from "./translation/i18n";
export { defaultSettings } from "./settings";
export type { Settings, NameOrder, PlaceOrder, CurrentNameOfTown, LinkedPersons } from "./settings";

// ... all existing exports
```

**Create `README.md`:**
- Installation instructions
- Basic usage example
- Pluggable dependencies (translation, settings)
- API documentation
- Contributing guidelines

---

## Priority Order

1. **Fix circular imports** (CRITICAL - blocks everything)
2. **Copy missing utils** (common-creator, get-all-prop)
3. **Add missing type exports** (ConvertType)
4. **Fix structures imports**
5. **Handle getFamilyWith** (comment out or copy)
6. **Fix parser.ts constants/selectors**
7. **Fix remaining TypeScript errors**
8. **Test build succeeds** ✅
9. Update main project Settings
10. Remove moved files from main project
11. Prepare for npm publish

---

## Commands to Run

After fixing each issue:
```bash
cd packages/gedcom-parser
npm run build
```

When all errors are fixed:
```bash
# Test build
npm run build

# Commit gedcom-parser
git add -A
git commit -m "fix: resolve all build errors and circular dependencies"
git push origin main

# Commit main project (updates submodule reference)
cd ../..
git add packages/gedcom-parser
git commit -m "chore: update gedcom-parser submodule"
git push origin feat/gedcom-parser
```

---

## Notes

- **Strict mode is disabled** - Can be re-enabled after all errors are fixed
- **ES2021/ES2023 libs added** - For `toSorted`, `toReversed`, `replaceAll` methods
- **Translation system is pluggable** - Consumer provides translation function
- **Settings are extensible** - Consumer can add custom fields
