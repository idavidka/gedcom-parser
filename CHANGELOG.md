# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-02

### Added
- Initial release of `@treeviz/gedcom-parser` as standalone package
- Full GEDCOM 5.5.1 parsing support
- TypeScript type definitions for all GEDCOM structures
- Pluggable `ICacheManager` interface for optional caching
  - Default no-op implementation (SSR-safe)
  - Consumer provides implementation (IndexedDB, localStorage, Redis, etc.)
- Pluggable `ICountryDataProvider` interface for place matching
  - Default empty implementation
  - Consumer provides country/place data
- Core classes exported:
  - `GedcomTree` - Main parser
  - `Individuals`, `Families`, `Sources`, `Repositories`, etc.
  - Individual, Family, Source, Repository, Media, Submitter classes
- Utility functions:
  - `Order`, `Filter`, `Group` for collections
  - Date formatting and parsing
  - Name formatting
  - Place translation
- Helper functions:
  - `setCacheFactory()` / `setIndexedDbFactory()` (legacy)
  - `setCountryDataProvider()`
  - `getCountryTranslations()`, `getCountryData()`, etc.
- Comprehensive documentation:
  - Complete API reference
  - Setup examples (React, Node.js)
  - Performance optimization guide
  - TypeScript usage examples

### Architecture
- Zero browser-specific dependencies in core package
- Factory pattern for dependency injection
- No-op defaults for all pluggable components
- Fully tree-shakeable
- SSR-safe

### Performance
- Optional caching provides 10-20x speedup for:
  - Path calculations between individuals
  - Relatives queries at multiple degrees
- Memory efficient with lazy loading
- Incremental parsing support

[1.0.0]: https://github.com/idavidka/gedcom-parser/releases/tag/v1.0.0
