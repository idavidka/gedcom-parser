# GEDCOM Parser Package - Implementation Status

## Summary

The GEDCOM parser package has been created with the basic structure and core files, but there are several issues preventing compilation. These need to be resolved before the package can be used independently.

## What's Working

✅ Package structure created (`packages/gedcom-parser/`)
✅ Core files copied:
- Parser logic (parser.ts, common-creator.ts)
- All GEDCOM class files (19 files)
- All interface files (11 files)
✅ Basic configuration files (package.json, tsconfig.json, README.md)
✅ Types, constants, and utilities extracted
✅ Simplified `indis.ts` to remove app-specific dependencies

## Issues Preventing Compilation

### 1. Missing App Dependencies in Multiple Files

Several class files still import app-specific modules:

**fam.ts**
- `../../../types/structures/family`

**gedcom.ts**
- `../../../types/structures/gedcom`
- `../../../utils/get-product-details`

**indi.ts** (Heavy dependencies - 700+ lines)
- `../../../constants/filters`
- `../../../constants/orders`
- `../../../translation/i18n`
- `../../../types/ancestry-media`
- `../../../types/structures/individual`
- `../../../utils/cache`
- `../../../utils/date-formatter`
- `../../../utils/get-places`
- `../../../utils/logger`
- `../../kinship-translator/kinship-translator`

**indi-with-dimension.ts**
- `../../../types/graphic-types`
- `../../../types/structures/individual`

**obje.ts, repo.ts, sour.ts**
- Structure type imports (multimedia-link, repository, source)

### 2. Interface Implementation Mismatches

- `Individuals` class doesn't fully implement `IIndividuals` interface (missing ~15 methods)
- Interface files import from wrong paths
- Missing exports like `IList`, `ConvertOptions`

### 3. Type System Issues

- Missing GEDCOM tags: `OCCUPATIONS`, `BAPT`, `CHRI`, `FACT`
- Type mismatches in `gedcom.ts` when accessing list methods
- Generic type constraints need adjustment

### 4. Method Signature Mismatches

- `List.filter()` and related methods expect different number of parameters
- OrderIterator signature doesn't match usage
- GroupIterator signature doesn't match usage

## Recommended Approach

Given the complexity of the dependencies, there are two paths forward:

### Option A: Minimal Parser Package (Recommended)

Create a truly minimal parser that ONLY handles parsing GEDCOM files into basic structures:

1. **Keep**: Core parsing logic, Common class, basic GEDCOM classes
2. **Remove**: Advanced features like:
   - Kinship calculation
   - Place translation/formatting
   - Complex filtering/ordering/grouping
   - Media handling
   - Caching logic
3. **Move to App**: All display/formatting/UI-related logic stays in main app

This would result in a ~80% smaller, focused parser library.

### Option B: Full-Featured Package

Move ALL dependencies into the parser package:

1. Copy utility functions (date-formatter, place-translator, etc.)
2. Copy type definitions
3. Copy constants
4. Make i18n optional/injectable
5. Fix all type mismatches

This keeps full functionality but creates a much larger package.

## Next Steps to Complete (Option A)

1. **Strip down indi.ts**: Remove kinship, caching, formatting methods
2. **Simplify gedcom.ts**: Remove merge/clone logic (or make it basic)
3. **Remove indi-with-dimension.ts**: This is UI-specific
4. **Stub out interfaces**: Create minimal interfaces that match actual classes
5. **Fix exports**: Export only what's actually implemented
6. **Add missing tags**: Update types.ts with all required tags
7. **Test parsing**: Ensure core parse() function works

## Next Steps to Complete (Option B)

1. **Copy utilities**: Move ~10 utility files from main app
2. **Copy types**: Move structure type definitions
3. **Make i18n injectable**: Allow app to provide translation function
4. **Fix all imports**: Update all ` ../../../` references
5. **Add all missing tags**: Update types.ts comprehensively
6. **Fix signatures**: Align method signatures across classes/interfaces
7. **Build and test**: Ensure everything compiles

## Time Estimate

- **Option A**: 4-6 hours (recommended for initial release)
- **Option B**: 12-16 hours (better for long-term)

## Current State

The package is about **40% complete**. Core structure is good, but needs significant cleanup to be buildable.

## Repository Creation

Once the package builds successfully, these steps are needed:

1. Create new GitHub repository: `idavidka/gedcom-parser`
2. Move `packages/gedcom-parser/` contents to new repo
3. Add as git submodule: `git submodule add https://github.com/idavidka/gedcom-parser.git packages/gedcom-parser`
4. Update main app to import from `@treeviz/gedcom-parser`
5. Test end-to-end

---

**Note**: The user should decide which approach (A or B) to take based on their priorities: quick integration vs. full feature parity.
