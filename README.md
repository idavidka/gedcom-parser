# gedcom-parser

A TypeScript library for parsing and manipulating GEDCOM genealogy files.

## Features

- **GEDCOM Parser**: Parse GEDCOM format files into structured TypeScript objects
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **GEDCOM Classes**: Rich object model for individuals, families, sources, repositories, etc.
- **Extensible**: Support for standard GEDCOM tags and custom extensions

## Installation

```bash
npm install gedcom-parser
```

## Usage

```typescript
import GedcomParser from 'gedcom-parser';

// Parse a GEDCOM string
const gedcomContent = `
0 HEAD
1 SOUR TreeViz
0 @I1@ INDI
1 NAME John /Doe/
0 TRLR
`;

const { gedcom, raw } = GedcomParser.parse(gedcomContent);

// Access parsed data
console.log(gedcom.HEAD); // Header information
console.log(gedcom['@@INDI']); // List of individuals
```

### With Options

```typescript
const { gedcom, raw } = GedcomParser.parse(gedcomContent, {
  settings: {
    linkedPersons: 'merge', // 'merge', 'clone', or 'skip'
    linkingKey: '_FS_LINK'  // Custom linking tag
  }
});
```

## API

### `GedcomParser.parse(content: string, options?: ParseOptions)`

Parses a GEDCOM string and returns a structured object.

**Parameters:**
- `content`: The GEDCOM file content as a string
- `options`: Optional parsing configuration
  - `settings.linkedPersons`: How to handle linked persons ('merge', 'clone', 'skip')
  - `settings.linkingKey`: Custom tag for linking persons

**Returns:**
- `gedcom`: Parsed GEDCOM object with typed structure
- `raw`: Processed GEDCOM content as string

### Classes

The parser provides rich TypeScript classes for GEDCOM structures:

- `GedCom`: Root GEDCOM object
- `Indi`: Individual/person
- `Fam`: Family
- `Sour`: Source
- `Repo`: Repository
- `Obje`: Media object
- `Note`: Note
- And more...

## Development

This package is part of the TreeViz monorepo.

```bash
# Build the package
npm run build

# Watch mode for development
npm run dev

# Run linter
npm run lint
```

## License

MIT

## Contributing

This package is extracted from the TreeViz genealogy visualizer project.
For issues or contributions, please visit: https://github.com/idavidka/gedcom-visualiser
