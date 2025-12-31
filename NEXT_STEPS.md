# GEDCOM Parser Package Extraction - Final Steps

## Overview

I've created the initial structure for the `gedcom-parser` package at `packages/gedcom-parser/`. The package includes all core GEDCOM parsing files and basic configuration, but **cannot compile yet** due to dependencies on main app utilities.

## What I've Completed

### ✅ Package Structure Created

```
packages/gedcom-parser/
├── package.json          # Package configuration with dependencies
├── tsconfig.json         # TypeScript configuration
├── README.md             # Usage documentation
├── .gitignore            # Build artifacts exclusion
├── src/
│   ├── index.ts          # Main export file
│   ├── parser.ts         # Core GEDCOM parser logic
│   ├── common-creator.ts # Helper for creating GEDCOM objects
│   ├── types.ts          # Type definitions (260+ lines)
│   ├── constants.ts      # Regular expressions and config
│   ├── utils.ts          # Utility functions
│   ├── classes/          # 19 GEDCOM class files
│   │   ├── common.ts
│   │   ├── gedcom.ts
│   │   ├── indi.ts
│   │   ├── fam.ts
│   │   └── ... (15 more)
│   └── interfaces/       # 11 interface files
```

### ✅ Configuration Files

- **package.json**: Configured with lodash, date-fns dependencies
- **tsconfig.json**: TypeScript config with ES2021+ support
- **README.md**: Complete usage documentation
- **.gitignore**: Proper exclusions

### ✅ Core Files Extracted

- All GEDCOM classes and interfaces copied
- Parser logic extracted
- Types consolidated
- Constants isolated
- Basic imports updated

## ⚠️ What Still Needs Work

The package has **compilation errors** due to dependencies on app-specific utilities. See `IMPLEMENTATION_STATUS.md` for full details.

### Critical Issues

1. **Heavy App Dependencies** (especially in `indi.ts`):
   - Kinship translator
   - Place translator
   - Name formatter
   - Date formatter
   - Caching logic
   - i18n translations

2. **Interface Mismatches**:
   - `Individuals` class missing ~15 methods from interface
   - Type imports pointing to old paths

3. **Type System Issues**:
   - Missing GEDCOM tags
   - Generic type constraints
   - Method signature mismatches

## 🎯 Recommended Next Steps

You have **two paths forward**:

### Option A: Minimal Parser (Recommended - 4-6 hours)

Create a focused parser that ONLY parses GEDCOM → object structure:

1. Strip advanced features from `indi.ts`, `gedcom.ts`
2. Remove UI-specific classes (`indi-with-dimension.ts`)
3. Simplify interfaces to match actual implementations
4. Remove dependency on kinship, formatting, translation
5. Keep core parsing + basic class access

**Result**: Clean, focused parser library (~20KB gzipped)

### Option B: Full-Featured Package (12-16 hours)

Move ALL functionality into the parser:

1. Copy 10+ utility files from main app
2. Copy all type definitions
3. Make i18n injectable
4. Fix all import paths
5. Implement all interface methods

**Result**: Complete, self-contained parser (~80KB gzipped)

## 📋 Manual Steps Required

### 1. Create GitHub Repository

I cannot create GitHub repositories directly. You'll need to:

```bash
# Create new repo on GitHub: idavidka/gedcom-parser
# Then locally:
cd packages/gedcom-parser
git init
git add .
git commit -m "Initial commit: GEDCOM parser extraction"
git remote add origin https://github.com/idavidka/gedcom-parser.git
git push -u origin main
```

### 2. Add as Submodule

After repository is created:

```bash
cd /path/to/gedcom-visualiser
rm -rf packages/gedcom-parser  # Remove local version
git submodule add https://github.com/idavidka/gedcom-parser.git packages/gedcom-parser
git commit -m "Add gedcom-parser as submodule"
```

### 3. Update Main App

After package builds successfully:

```bash
# Update .gitmodules
# Already done - just needs the repository to exist

# Add to package.json workspace (already configured)

# Update imports in main app:
# From: import GedcomTree from '../../utils/parser'
# To:   import GedcomTree from 'gedcom-parser'
```

## 🔨 Building the Package

Currently fails with ~70 errors. After fixes:

```bash
cd packages/gedcom-parser
npm install
npm run build   # Should create dist/ folder
```

## 📁 Files Committed

The following files are in the current commit:

- Package structure: `packages/gedcom-parser/`
- All source files: `src/` (41 files)
- Configuration: `package.json`, `tsconfig.json`, `.gitignore`
- Documentation: `README.md`, `IMPLEMENTATION_STATUS.md`

## 🤝 My Recommendation

I recommend **Option A (Minimal Parser)** because:

1. ✅ Faster to complete (4-6 hours vs 12-16 hours)
2. ✅ Cleaner separation of concerns
3. ✅ Smaller bundle size
4. ✅ Easier to maintain
5. ✅ UI/formatting logic belongs in the app anyway

The parser's job should be: **GEDCOM text → structured objects**

The app's job should be: **structured objects → UI/visualization/formatting**

## 📞 Questions?

If you need help deciding which approach to take, or want me to implement either option, let me know!

## 🏁 Current Checklist

Based on the issue requirements:

- [x] Create new package skeleton matching existing submodule conventions
- [x] Copy parser sources + class files into `src/`
- [x] Create `index.ts` exports to match current import surface
- [x] Wire build output and `exports` in `package.json`
- [x] Add documentation and configuration files
- [ ] **Fix compilation errors** (choose Option A or B)
- [ ] Create GitHub repository manually
- [ ] Add as git submodule
- [ ] Update main repo dependency + replace imports
- [ ] Ensure dev/build works in Vite and CI
- [ ] Add/migrate tests proving basic parse works
- [ ] Remove old parser location from main repo

**Status**: ~60% complete. Foundation is solid, needs compilation fixes and repository setup.
