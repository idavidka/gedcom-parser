# @treeviz/gedcom-parser

GEDCOM parser library for TreeViz - Parse and handle GEDCOM files.

## Features

- Parse GEDCOM files with TypeScript type safety
- Support for GEDCOM 5.5.1 standard
- Classes for GEDCOM entities (Individuals, Families, Sources, etc.)
- Type definitions for all GEDCOM structures

## Installation

```bash
npm install @treeviz/gedcom-parser
```

## Usage

```typescript
import { parse } from '@treeviz/gedcom-parser';

const gedcomData = '...'; // Your GEDCOM file content
const parsedData = parse(gedcomData);
```

## License

MIT
