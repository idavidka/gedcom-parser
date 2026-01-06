# GitHub Copilot Instructions - GEDCOM Parser

## Project Overview

**GEDCOM Parser** (@treeviz/gedcom-parser) is a TypeScript library for parsing and manipulating GEDCOM (GEnealogical Data COMmunication) files. It provides a robust API for reading genealogy data, navigating family relationships, and exporting data in various formats.

### Tech Stack

- **Language**: TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest
- **Package Manager**: npm
- **Module Format**: ES Modules

### Project Structure

```
gedcom-parser/
├── src/                    # Source code
│   ├── classes/           # Core classes (Gedcom, Indi, Fam, etc.)
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   ├── __tests__/         # Unit tests
│   └── index.ts           # Main entry point
├── docs/                  # Documentation
└── examples/              # Usage examples
```

### Key Features

1. **GEDCOM Parsing**: Parse GEDCOM files (.ged) into structured JavaScript objects
2. **Family Relationships**: Navigate parent-child, spouse, sibling relationships
3. **Kinship Calculation**: Calculate relationship degrees (cousin, removed, etc.)
4. **Date Handling**: Parse and format GEDCOM date formats
5. **Export**: Convert parsed data back to GEDCOM or JSON format
6. **Type Safety**: Full TypeScript support with comprehensive type definitions

### Code Style & Conventions

1. **Language**: All code, comments, and documentation should be in **English**
   - **Code**: Variable names, function names, class names must be in English
   - **Comments**: All inline comments and documentation comments must be in English
   - **Documentation**: All `.md` files must be in English
   - **Commit Messages**: Write commit messages in English
   - **Copilot Responses**: Always respond in the **same language as the user's question**
2. **TypeScript**: Strict mode enabled, avoid `any` types
3. **File Naming**: 
   - Classes: `PascalCase.ts`
   - Utils: `kebab-case.ts`
   - Constants: `UPPER_SNAKE_CASE`
4. **Import Order**: External libraries → Internal modules → Types
5. **Testing**: Write unit tests for all public APIs
6. **Documentation**: JSDoc comments for exported functions and classes

### Commit Message Convention

Follow **Conventional Commits** specification:

**Format:** `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `chore`: Other changes

**Examples:**
```
feat(parser): add support for custom tags
fix(date): handle malformed date strings
docs: update API reference
test(indi): add kinship calculation tests
perf(parser): optimize large file parsing
```

### Common Tasks

#### Running Tests
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI
```

#### Building
```bash
npm run build        # Build for production
npm run dev          # Development mode with watch
```

#### Publishing to NPM
```bash
npm version patch|minor|major
npm run build
npm publish
```

### API Structure

#### Main Classes

1. **Gedcom**: Root class representing the entire GEDCOM file
   - Methods: `getIndis()`, `getFams()`, `getIndi(id)`, `toGedcom()`, `toJson()`

2. **Indi**: Individual person record
   - Methods: `getName()`, `getBirthDate()`, `getDeathDate()`, `getParents()`, `getSpouses()`, `getChildren()`

3. **Fam**: Family record
   - Methods: `getHusband()`, `getWife()`, `getChildren()`, `getMarriageDate()`

4. **Date**: GEDCOM date handling
   - Methods: `format()`, `toISO()`, `compare()`

### Testing Best Practices

1. **Coverage**: Aim for >80% code coverage
2. **Test Structure**: Arrange-Act-Assert pattern
3. **Mock Data**: Use realistic GEDCOM samples in `__tests__/mocks/`
4. **Edge Cases**: Test malformed data, missing fields, invalid dates
5. **Performance**: Test parsing speed with large files

### Performance Optimization

- **Lazy Loading**: Parse data on-demand when possible
- **Caching**: Cache frequently accessed relationships
- **Memory**: Avoid loading entire large files into memory
- **Indexing**: Build lookup maps for O(1) ID searches

### Common Issues & Solutions

#### Large File Performance
- Use streaming parser for files >10MB
- Implement pagination for large individual lists
- Consider web worker for browser usage

#### Date Format Variations
- GEDCOM supports multiple date formats (exact, approximate, ranges)
- Use the Date class for consistent handling
- Test with various date formats

#### Encoding Issues
- GEDCOM files may use different encodings (UTF-8, ANSI, etc.)
- Handle BOM (Byte Order Mark) correctly
- Validate encoding in header

### Documentation

All public APIs should have JSDoc comments:

```typescript
/**
 * Parse a GEDCOM file and return a Gedcom object
 * @param content - GEDCOM file content as string
 * @returns Parsed Gedcom object
 * @throws Error if file format is invalid
 */
export function parseGedcom(content: string): Gedcom {
  // ...
}
```

### Contact & Resources

- **NPM Package**: @treeviz/gedcom-parser
- **Repository**: https://github.com/idavidka/gedcom-parser
- **Documentation**: README.md and API.md
- **Parent Project**: TreeViz Monorepo

---

**When working on this project:**
1. Always write in English (code, comments, docs)
2. Add tests for new features
3. Update documentation when changing APIs
4. Follow TypeScript best practices
5. Optimize for performance with large GEDCOM files
6. Maintain backward compatibility when possible
7. **After completing changes, ALWAYS suggest a commit message** following Conventional Commits format

**Commit Message Reminder:**
After making any changes, ALWAYS provide a suggested commit message at the end of your response:

```
---

## 🎯 Suggested Commit Message

type(scope): brief description
```
