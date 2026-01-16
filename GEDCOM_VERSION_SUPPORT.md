# GEDCOM Version Support

This document describes the GEDCOM version detection and conversion features added to `@treeviz/gedcom-parser`.

## Features

### 1. Automatic Version Detection

The parser automatically detects whether a GEDCOM file is version 5.x or 7.0 and routes to the appropriate parser:

```typescript
import GedcomTree, { detectGedcomVersion } from '@treeviz/gedcom-parser';

// Automatic detection during parsing
const { gedcom } = GedcomTree.parse(gedcomContent);
// Works with both GEDCOM 5.x and 7.0 files

// Manual version detection
const version = detectGedcomVersion(gedcomContent);
console.log(version); // 5 or 7
```

### 2. Version-Specific Serialization

Export data in either GEDCOM 5 or GEDCOM 7 format:

```typescript
// Default: Export as GEDCOM 5 (backward compatible)
const gedcom5String = gedcom.toGedcom();

// Explicitly export as GEDCOM 5
const gedcom5String = gedcom.toGedcom(undefined, undefined, { version: 5 });

// Export as GEDCOM 7
const gedcom7String = gedcom.toGedcom(undefined, undefined, { version: 7 });
```

### 3. Version Conversion

Convert between GEDCOM versions:

```typescript
// Parse a GEDCOM 5 file and export as GEDCOM 7
const { gedcom } = GedcomTree.parse(gedcom5Content);
const gedcom7String = gedcom.toGedcom(undefined, undefined, { version: 7 });

// Parse a GEDCOM 7 file and export as GEDCOM 5
const { gedcom } = GedcomTree.parse(gedcom7Content);
const gedcom5String = gedcom.toGedcom(undefined, undefined, { version: 5 });
```

## API Reference

### `detectGedcomVersion(content: string): 5 | 7 | undefined`

Detects the GEDCOM version from file content.

**Parameters:**
- `content` - GEDCOM file content as string

**Returns:**
- `5` - GEDCOM 5.x file detected
- `7` - GEDCOM 7.x file detected
- `undefined` - Version could not be determined

### `toGedcom(tag?, level?, options?): string`

Converts the parsed GEDCOM data to a GEDCOM string.

**Options:**
- `version?: 5 | 7` - Target GEDCOM version (default: 5)
- `original?: boolean` - Use original header (default: false)
- `indis?: IndiKey[]` - Filter to specific individuals

## Backward Compatibility

All changes are backward compatible:

1. **Default behavior unchanged**: Without specifying a version, output defaults to GEDCOM 5
2. **Same output type**: Both parsers produce the same `GedcomType` structure
3. **No breaking changes**: Existing code continues to work without modifications

## GEDCOM Version Differences

### GEDCOM 5.x
- Version format: `5.5`, `5.5.1`, etc.
- Standard header: `1 GEDC / 2 VERS 5.5.1`

### GEDCOM 7.0
- Version format: `7.0`, `7.0.x`
- Standard header: `1 GEDC / 2 VERS 7.0`
- Additional features: SCHMA tag for extensions

## Examples

### Example 1: Parse and detect version

```typescript
import GedcomTree from '@treeviz/gedcom-parser';

const { gedcom } = GedcomTree.parse(fileContent);
const version = gedcom.HEAD?.GEDC?.VERS?.value;
console.log(`Parsed GEDCOM version: ${version}`);
```

### Example 2: Convert GEDCOM 5 to 7

```typescript
import GedcomTree from '@treeviz/gedcom-parser';
import fs from 'fs';

// Read GEDCOM 5 file
const gedcom5Content = fs.readFileSync('family5.ged', 'utf-8');

// Parse and convert to GEDCOM 7
const { gedcom } = GedcomTree.parse(gedcom5Content);
const gedcom7Content = gedcom.toGedcom(undefined, undefined, { version: 7 });

// Save as GEDCOM 7
fs.writeFileSync('family7.ged', gedcom7Content);
```

### Example 3: Validate version before processing

```typescript
import { detectGedcomVersion } from '@treeviz/gedcom-parser';

const version = detectGedcomVersion(fileContent);

if (version === 7) {
  console.log('Processing GEDCOM 7 file...');
} else if (version === 5) {
  console.log('Processing GEDCOM 5 file...');
} else {
  console.error('Unknown GEDCOM version');
}
```

## Testing

The implementation includes comprehensive tests:
- Version detection (6 tests)
- GEDCOM 5 parsing (2 tests)
- GEDCOM 7 parsing (5 tests)
- Version serialization (13 tests)
- Backward compatibility (2 tests)

Run tests with:
```bash
npm test
```

## Notes

1. Both GEDCOM 5 and 7 use the same internal data model (`GedcomType`)
2. The main difference during serialization is the version number in the header
3. GEDCOM 7 may include additional tags (like SCHMA) that are preserved during parsing
4. Version detection is based on the `GEDC.VERS` tag in the header
