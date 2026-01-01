# Get Places Utility

This module provides comprehensive utilities for parsing, validating, and managing place (town/county/country) data in GEDCOM genealogical records. It supports multiple countries through an advanced country registry system with specialized support for Hungarian and Austrian historical administrative divisions.

## Overview

The module handles complex scenarios such as:

- **Multi-Country Registry Architecture**: Completely refactored extensible country registry system
- **Country-Specific Data Organization**: Dedicated folder structure (`sources/hungary/`, `sources/austria/`, etc.)
- **Advanced Country Detection**: Multi-pass detection system with translation conflict resolution
- **Cross-Country Town Merging**: Intelligent merging of towns with same names from different countries
- **Individual Country Validation**: Each country validates its own translations to prevent conflicts
- **Historical Administrative Changes**: Towns that changed counties over time due to reorganizations
- **Town Mergers and Splits**: Complex relationships between parent and child towns
- **Settlement from Parent Towns**: Towns that didn't exist before being settled from another town
- **Range Inheritance**: Automatic inheritance of historical data from parent to child towns
- **Assimilation Scenarios**: Towns that were merged into others over time
- **Name Variations**: Historical name changes and aliases
- **Multi-Language Translation Support**: Full support for Hungarian, German, English, French, and Spanish

## Country Registry System Overhaul

### Major Changes in This Branch

This branch introduces a **complete architectural overhaul** of the place suggestion system:

**🚫 Removed Hungarian Fallback Dependencies:**

- Eliminated hardcoded Hungarian fallback logic
- Removed global Hungarian data dependencies
- All countries now have equal status in the registry

**🏗️ Country Registry Architecture:**

- Each country is registered using `registerCountry()` function
- Country-specific data stored in dedicated folders
- Independent translation validation per country
- Order-independent country detection (no priority conflicts)

**🌍 Multi-Country Town Merging:**

- Advanced merging algorithm in `getCombinedDetailedTowns()`
- Handles duplicate town names across countries
- Preserves country context in all merged data
- Smart range conflict resolution for historical data

**Key Features:**

- **Centralized Country Management**: All country-specific data is managed through `country-registry.ts`
- **Dynamic Data Loading**: County and town data is loaded based on detected or specified country
- **Multi-language Translation Support**: Each country can have translations in multiple languages
- **Extensible Design**: Easy to add new countries using the `registerCountry()` function
- **No Default Fallback**: Each country must be explicitly registered and detected - `guessTown()` and other functions require explicit country code
- **Combined Towns Data**: Access towns from all countries via `getCombinedDetailedTowns()` to avoid name conflicts

**Supported Countries:**

Currently registered countries:

- **Hungary (HU)**: Full support with counties, towns, and historical data
- **United States (US)**: Basic translation support
- **Germany (DE)**: Basic translation support
- **France (FR)**: Basic translation support
- **Spain (ES)**: Basic translation support

### Using the Country Registry

```typescript
import {
	detectCountryCode,
	getCountiesForCountry,
	getAllCountryCodes,
	isCountryName,
} from "./get-places";

// Detect country from a name
const code = detectCountryCode("Hungary"); // Returns "HU"
const code2 = detectCountryCode("Magyarország"); // Returns "HU" (Hungarian name)
const code3 = detectCountryCode("United States"); // Returns "US"

// Check if a string is a country name
isCountryName("Hungary"); // true
isCountryName("Budapest"); // false

// Get all registered country codes
const codes = getAllCountryCodes(); // ["US", "DE", "FR", "ES", "HU"]

// Get counties for a specific country
const huCounties = getCountiesForCountry("HU"); // Returns Hungarian counties
const usCounties = getCountiesForCountry("US"); // Returns undefined (not yet configured)
```

### Country-Aware Functions

Key functions now support country-specific behavior:

**guessTown with Country Context:**

```typescript
// Guess town with country context
const result = guessTown("Budapest", 1900, "HU");
// Returns county and country information specific to Hungary
```

**getPlaceParts with Automatic Detection:**

```typescript
// Automatically detects country and uses appropriate county patterns
const parts = getPlaceParts("New York, New York, United States");
// Detects "United States" and uses US-specific parsing if available
```

### Working with Towns Data

**Accessing Country-Specific Towns:**

```typescript
import { getDetailedTownsForCountry } from "./get-places";

// Get towns for a specific country
const huTowns = getDetailedTownsForCountry("HU");
// Returns: Record<string, TownData> for Hungary
```

**Accessing Combined Towns from All Countries:**

```typescript
import { getCombinedDetailedTowns } from "./get-places";

// Get merged towns from all countries with smart conflict resolution
const allTowns = getCombinedDetailedTowns();
// Returns: Towns (Record<string, Partial<Ranges> | string>)

// The function automatically:
// - Adds country information to all Town objects
// - Merges duplicate town names from different countries
// - Preserves range-based historical data
// - Handles conflicts by creating arrays of towns
```

**Advanced Town Merging:** The current implementation uses sophisticated merging logic:

- **Country Context Preservation**: Every town entry includes country information
- **Range Conflict Resolution**: When towns with the same name exist in multiple countries, ranges are merged intelligently
- **Historical Data Preservation**: Time-based ranges (`"1872-1949"`, `"1950-"`) are preserved and combined
- **Name Variations**: Alternative names (`names` array) are merged from all countries

### Adding New Countries

The registry system makes it easy to add new countries. There are two approaches:

#### Approach 1: Using `registerCountry()` (Recommended)

```typescript
import { registerCountry } from "./get-places";

// Simple registration with just translations
registerCountry({
	code: "AT",
	name: "Austria",
	translations: { Austria: "Österreich", Österreich: "Austria" },
});

// Full registration with county and town data
import atCounties from "../../sources/austria/counties.json";
import atTowns from "../../sources/austria/towns.json";

registerCountry({
	code: "AT",
	name: "Austria",
	translations: atTranslations,
	counties: atCounties,
	townSources: [atTowns],
	townsDetailed: atTownsDetailed,
});
```

#### Approach 2: Direct Registration in country-registry.ts

For permanent additions, register directly in `country-registry.ts`:

1. **Create country data directory:**

    ```
    src/sources/[country-code]/
      counties.json       # County data
      towns.json         # Modern town data
      old-towns-list.json # Historical town data (optional)
      towns-detailed.json # Detailed town configurations (optional)
    ```

2. **Import data in country-registry.ts:**

    ```typescript
    import xxCountries from "../../translation/xx-countries.json";
    import xxCounties from "../../sources/xx/counties.json";
    import xxTowns from "../../sources/xx/towns.json";
    ```

3. **Register using `registerCountry()`:**

    ```typescript
    registerCountry({
    	code: "XX",
    	name: "Country Name",
    	translations: xxCountries as CountryTranslations,
    	counties: xxCounties as CountyData,
    	townSources: [xxTowns as unknown as TownSource],
    });
    ```

4. **Add translation file (optional):**
    ```
    src/translation/[language]-countries.json
    ```

**Important Notes:**

- Registration order matters for detection priority
- Countries with smaller, more specific translation files should be registered first
- Countries with comprehensive translation files (like Hungary) should be registered last
- If no country is detected, functions will return `undefined` instead of defaulting to Hungary

## Main Features

### 1. Town Parsing (`parseTowns`)

The core function that parses town configuration data and creates a comprehensive mapping of towns with their administrative divisions across different time periods.

**Processing Pipeline:**

The function operates in three main phases:

**Phase 1: Initial Population**

- Loads town data from configuration
- Normalizes all entries into `PureTowns` format
- Preserves name aliases from source data
- Creates foundation for parent-child relationships

**Phase 2a: Missing Child Keys & Name Inheritance**

- Scans all parent ranges to find referenced child towns
- Creates entries for implicitly referenced children (not in source data)
- Builds child data from parent ranges using `buildChildFromParent()`
- Handles name inheritance for renames (when parent points to single target)

**Phase 2b: Range Inheritance for Settlement Towns**

- **Critical for historical accuracy**: Towns that didn't exist before settlement
- Detects children with first ranges (`-YEAR`) pointing to a parent
- Inherits ALL parent ranges that existed before child's separation year
- Replaces single first range with multiple inherited ranges
- Correctly splits overlapping parent ranges at separation boundary
- Example: `Rákosliget` (-1906 → Rákoskeresztúr) inherits parent's -1875 and 1876-1906 ranges

**Phase 2c: Parent Range Splitting & Child Addition**

- Processes each parent with children
- Identifies separation years when children became independent
- Splits parent ranges at separation points
- Adds child names to parent's town list AFTER separation (when independent)
- Example: `Rákoskeresztúr` shows children only after they separated

**Key capabilities:**

- **Automatic range inheritance**: Complete historical county data for settled towns
- **Smart separation detection**: Uses latest "was part of" range to determine separation
- **Parent-child bidirectionality**: Updates both parent and child data
- **Assimilation handling**: Manages towns that were merged (last ranges)
- **Intermediate naming**: Handles temporary naming periods
- **Performance optimization**: Results cached for repeated use

### 2. Place Validation (`placesValidator`)

Comprehensively validates place names in GEDCOM data against historical records.

**Validation Categories:**

- **Invalid/outdated names**: Towns that changed names or no longer exist
- **Missing geographic components**:
    - Records without country information
    - Records without county information
- **Common spelling mistakes**: Detects patterns like "ue" instead of "ü", wrong capitalization
- **Similar place names**: Uses Levenshtein distance to find potential typos
- **Single-component places**: Places with only country (no town/county)
- **Whitespace issues**: Leading/trailing spaces, double spaces
- **County validation by year**: Verifies county is correct for the event date

**Parameters:**

- `gedcom`: The GEDCOM data object to validate
- `usedTownConfig`: Optional custom town configuration (defaults to built-in)
- `usedCountry`: Filter by specific country/countries
- `usedTown`: Filter by specific town(s)
- `usedIndis`: Filter by specific individual IDs

**Returns:**

```typescript
{
  allPlaces: Record<string, IndiKey[]>,           // All places found
  placeNames: string[],                            // Unique place names
  similarPlaces: Record<number, ...>,              // Distance-grouped similar names
  missingCountries: Record<string, IndiKey[]>,    // Places without country
  missingCounties: Record<string, IndiKey[]>,     // Places without county
  whiteSpaces: Record<string, IndiKey[]>,         // Places with whitespace issues
  commonMistakes: Record<string, IndiKey[]>,      // Places with common errors
  onlyCountry: Record<string, IndiKey[]>,         // Places with only country
  towns: Record<string, Record<IndiKey, TownValidity[][]>>, // Detailed validation
  townsCount: number                               // Total invalid count
}
```

### 3. County/Town Resolution (`getValidCountyByTownAndYear`)

Determines the correct administrative information for a town based on a specific date/year.

**Smart Resolution:**

- Looks up town in parsed configuration
- Finds the range that matches the given year
- Returns correct county for that historical period
- Handles missing dates gracefully
- Validates town, county, and country components

**Parameters:**

- `place`: Place string ("Town, County, Country") or array of parts
- `date`: CommonDate object, year number, or year string
- `usedTownConfig`: Optional custom town configuration

**Returns array of TownData:**

```typescript
{
  response: "Valid" | "Invalid" | "Not found" | "No date set",
  townResponse: "Valid" | "Invalid" | "Not found" | "No date set",
  countyResponse: "Valid" | "Invalid" | "Not found" | "No date set",
  countryResponse: "Valid" | "Invalid" | "Not found" | "No date set",
  county: string,      // Correct county for the year
  town: string | string[],  // Town name(s)
  country: string,     // Country name
  range: PrimitiveRange,    // The time range this applies to
  leftParts?: string[] // Additional location parts (e.g., district)
}
```

**Range Format:**

- `"-"`: All time periods (no specific range)
- `"-1875"`: Until 1875 (inclusive)
- `"1876-1949"`: From 1876 to 1949 (both inclusive)
- `"1950-"`: From 1950 onwards

### 4. Place Name Utilities

**`getPlaceParts(place)`**
Intelligently parses place strings into structured components.

Features:

- Handles comma-separated place strings
- Recognizes Hungarian county patterns using regex
- Deals with commas inside county names (e.g., "Pest-Pilis-Solt, Kiskun")
- Validates countries against known list
- Attempts to guess missing components
- Returns structured data with leftParts for extra location info

Returns:

```typescript
{
  country?: string,    // Identified country
  county?: string,     // Identified county
  town?: string,       // Identified town
  leftParts: string[], // Additional parts (districts, streets, etc.)
  parts: string[],     // All parsed parts
  current: string,     // Reconstructed normalized string
  original: string     // Original input
}
```

**`getCurrentNameOfTown(place, usedTownConfig?)`**
Gets the current/modern name of a historical town.

- Looks up town in configuration
- Finds the most recent range (ending with "-")
- Returns current administrative data
- Useful for modernizing historical records
- Returns array of possible current names if multiple

**`guessTown(town, date?)`**
Attempts to identify a town from incomplete information.

- Checks against `hu-towns.json` (modern towns)
- Checks against `hu-old-towns-list.json` (historical towns)
- Considers date to choose appropriate source (pre/post 1913)
- Returns suggested county and country if found
- Returns empty object if town not in database

### 5. Place Extraction (`getPlaces`)

Extracts place information from GEDCOM Common or List objects.

**Filtering Options:**

- By event type: `PlaceType.Birth`, `PlaceType.Death`, `PlaceType.Marriage`, etc.
- By multiple types: `[PlaceType.Birth, PlaceType.Death]`
- All events: `PlaceType.All`
- Military events: `PlaceType.Military`
- Military ID: `PlaceType.MilitaryId`
- General events: `PlaceType.Events`

**Recursion Control:**

- `maxLevel`: How deep to recurse into GEDCOM structure
- `level`: Current recursion level (internal)

**Returns Place array:**

```typescript
{
  key: string,      // Event type tag (BIRT, DEAT, MARR, etc.)
  index: number,    // Index in list
  obj?: Common,     // Parent GEDCOM object
  ref?: Common,     // Specific place reference
  place?: string    // Place string value
}
```

### 6. Helper Functions

**`isSame(townValidity)`**
Checks if validation shows place is already correct (no changes needed).

**`isWarning(error)`**
Checks if error is a warning level ("Not found", "No date set") vs critical.

**`isNotFound(error)`**
Checks if error indicates place was not found in database.

**`includesLowerCase(haystack, needle)`**
Case-insensitive comparison for strings or string arrays.

## Architecture & Internal Functions

### Processing Pipeline Overview

The `parseTowns()` function uses a sophisticated multi-phase pipeline:

```
Phase 1: Initial Population
  ↓
Phase 2a: Child Discovery & Name Inheritance
  ↓
Phase 2b: Range Inheritance (Settlement Towns)
  ↓
Phase 2c: Parent Range Splitting & Child Addition
  ↓
Result: Complete PureTowns with all relationships
```

### Key Internal Functions

**`getSeparationYears(childName, child, parentName)`**

- Calculates when a child separated from parent
- Examines all ranges where child points to parent
- Returns sorted array of separation year boundaries
- Used to split parent ranges correctly

**`applyChildSeparationsToParent(parent, childSeparations, childInfo)`**

- Splits parent ranges at child separation years
- Adds child names to appropriate segments
- Preserves parent's original county/country data
- Returns updated parent with split ranges

**`buildChildFromParent(parent, childName)`**

- Creates child entry from parent's ranges
- Transfers all parent ranges to child
- Adjusts town names based on whether child is included
- Used for implicitly referenced children

**`maybeInheritNameFromRename(parentName, rangeEntry, targetName, main, explicitKeys)`**

- Detects town renames (parent → single target)
- Adds parent name to child's aliases
- Only for non-explicit children (not in source data)
- Helps track historical name changes

**`getAssimilationStart(child, parentName)`**

- Finds when child will be assimilated into parent
- Looks for last ranges (`YEAR-`) with leftParts marker
- Returns start year of assimilation process

**`applyAssimilationToParent(parent, childName, cutYear)`**

- Handles future assimilation scenarios
- Adds child to parent BEFORE assimilation year
- Removes child AFTER assimilation
- Splits ranges at cut year

### Caching Strategy

The module uses multi-level caching for performance:

```typescript
parsedTownsCache: {
  config?: PureTowns,              // Fully parsed towns
  county: Record<string, TownData[]>,  // County lookups by "town-year"
  town: Record<string, string[]>,      // Town name variations
  current: Record<string, ...>         // Current name lookups
}
```

Cache keys are generated from:

- Town configuration JSON (stringified)
- Town name + year combinations
- Place strings for current name lookups

### Range Types & Their Meanings

**First Range (`-YEAR`)**:

- Town was part of parent until YEAR
- After YEAR, became independent
- Example: `-1906` means independent from 1907

**Last Range (`YEAR-`)**:

- Town will be assimilated from YEAR onwards
- Before YEAR, was independent
- Example: `1950-` means assimilated into parent from 1950

**Bounded Range (`YEAR1-YEAR2`)**:

- Town had specific status during this period
- Could be independent, part of parent, or intermediate naming
- Determined by town array content and leftParts

**Open Range (`-`)**:

- Applies to all time periods
- Usually for simple constant mappings
- No historical changes

## Data Structures

### Input Format (Towns Configuration)

Towns are defined with time ranges showing their administrative history:

```typescript
{
  "TownName": {
    "-1875": "CountyA",                    // Simple string: until 1875
    "1876-1949": "CountyB",                // From 1876 to 1949
    "1950-": {                              // From 1950 onwards (complex)
      "county": "CountyC",
      "leftParts": ["District"],
      "town": "CityName"
    },
    "names": ["Alias1", "Alias2"]          // Alternative names
  }
}
```

**Range Value Types:**

1. **Simple String**: Just the county name

    ```json
    "1876-1949": "Pest-Pilis-Solt-Kiskun"
    ```

2. **Town Object**: Full details including possible town change

    ```json
    "1950-": {
      "county": "Budapest",
      "town": "Budapest",              // New town name
      "leftParts": ["Rákoshegy"]       // Original name as district
    }
    ```

3. **Parent Reference**: Points to another town (was part of)

    ```json
    "-1906": {
      "county": "Pest-Pilis-Solt-Kiskun",
      "town": "Rákoskeresztúr"         // Was part of this town
    }
    ```

4. **Array**: Multiple configurations for same period
    ```json
    "1876-1949": [
      { "county": "CountyA", "town": "TownA" },
      { "county": "CountyB", "town": "TownB" }
    ]
    ```

### Internal Format (PureTowns)

After parsing, towns are normalized to `PureTowns` structure:

```typescript
type PureTowns = Record<string, Partial<PureRanges>>;

type PureRanges = {
	names: string[]; // Name aliases
	[rangeKey: PrimitiveRange]: PureTown[]; // Time ranges
};

type PureTown = {
	county?: string; // County name
	town: string[]; // Town name(s) as array
	country?: string; // Country name
	leftParts?: string[]; // Additional location parts
};
```

**Key Differences from Input:**

- Town always an array (never string)
- Each range maps to array of PureTown objects
- Consistent structure for all scenarios
- Names array always present

### Complex Scenarios Explained

#### 1. Range Inheritance (Settlement Towns)

**Scenario**: A town didn't exist before being settled from a parent town.

**Problem**: Source data only shows:

```json
"Rákosliget": {
  "-1906": {
    "county": "Pest-Pilis-Solt-Kiskun",
    "town": "Rákoskeresztúr"
  }
}
```

This says Rákosliget was part of Rákoskeresztúr until 1906, but what about before 1876 when the county changed?

**Solution**: Automatic inheritance from parent:

```json
"Rákosliget": {
  "-1875": {
    "county": "Pest-Pilis-Solt",           // Inherited
    "town": ["Rákoskeresztúr"]
  },
  "1876-1906": {
    "county": "Pest-Pilis-Solt-Kiskun",    // Inherited & split
    "town": ["Rákoskeresztúr"]
  },
  "1907-1949": {
    "county": "Pest-Pilis-Solt-Kiskun",    // Original data
    "town": ["Rákosliget"]
  }
}
```

**How it works:**

1. Detects first range (`-1906`) pointing to parent
2. Separation year = 1906 + 1 = 1907
3. Inherits all parent ranges before 1907
4. Splits overlapping parent range (1876-1949 → 1876-1906)
5. Original first range is replaced with inherited ranges

#### 2. Parent Range Splitting

**Scenario**: Parent has children that became independent at different times.

**Before processing:**

```json
"Rákoskeresztúr": {
  "1876-1949": "Pest-Pilis-Solt-Kiskun"
}
```

**After processing (with Rákosliget→1907, Rákoshegy→1922):**

```json
"Rákoskeresztúr": {
  "1876-1906": {
    "county": "Pest-Pilis-Solt-Kiskun",
    "town": ["Rákoskeresztúr"]              // Only parent
  },
  "1907-1921": {
    "county": "Pest-Pilis-Solt-Kiskun",
    "town": ["Rákoskeresztúr", "Rákosliget"] // + Rákosliget
  },
  "1922-1949": {
    "county": "Pest-Pilis-Solt-Kiskun",
    "town": ["Rákoskeresztúr", "Rákoshegy", "Rákosliget"] // + both
  }
}
```

**Logic:**

- Children appear in parent AFTER they became independent
- Parent range split at separation years (1907, 1922)
- Each segment shows which children existed independently then

#### 3. Town Assimilation

**Scenario**: Town will be merged into another in the future.

```json
"Suburb": {
  "1900-1949": "County",
  "1950-": {
    "county": "BigCity",
    "town": "BigCity",
    "leftParts": ["Suburb"]              // Marker: was absorbed
  }
}
```

**Meaning:**

- Before 1950: Independent town "Suburb"
- From 1950: Part of "BigCity", but tracked as district
- `leftParts` indicates this is assimilation, not just name change

#### 4. Intermediate Naming

**Scenario**: Town was temporarily named after parent.

```json
"ChildTown": {
  "-1900": {
    "county": "County",
    "town": "ParentTown"                // Was part of parent
  },
  "1901-1949": "County",                // Independent as ChildTown
  "1950-1974": {
    "county": "County",
    "town": "ParentTown"                // Temporarily named ParentTown
  },
  "1975-": "County"                     // Back to ChildTown
}
```

**Special handling:**

- These intermediate periods (bounded ranges pointing to parent)
- Child does NOT appear in parent's list during this period
- Different from "was part of" (first range) or "will be assimilated" (last range)

#### 5. Town Renames

**Scenario**: Town changed name but stayed independent.

```json
"OldName": {
  "1900-1949": {
    "county": "County",
    "town": "NewName"                   // Single target, no leftParts
  }
}
```

**Result:**

- `NewName` gets `["OldName"]` added to its `names` array
- Helps track historical name changes
- Only for implicit children (not in source data)

## Types Reference

### Exported Types

**`Towns`**

```typescript
Record<string, Partial<Ranges> | string>;
```

Input configuration format. Each town maps to either:

- Simple string (county name for all periods)
- Ranges object with time-based mappings

**`PureTowns`**

```typescript
Record<string, Partial<PureRanges>>;
```

Normalized internal format after parsing. All towns have consistent structure.

**`TownValidity`**

```typescript
{
  invalidTown: string | string[];      // Original town from data
  validTown: string | string[];        // Correct historical town
  suggestedTown?: string | string[];   // Suggested correction
  invalidCounty: string;               // Original county
  validCounty: string;                 // Correct historical county
  suggestedCounty?: string;            // Suggested county
  invalidCountry: string;              // Original country
  validCountry: string;                // Correct historical country
  suggestedCountry?: string;           // Suggested country
  townResponse?: string;               // Validation status
  countyResponse?: string;             // Validation status
  countryResponse?: string;            // Validation status
  year?: string;                       // Year being validated
  current?: string;                    // Current reconstructed place
  original?: string;                   // Original place string
  range?: string;                      // Time range that applies
  type?: string;                       // Event type (BIRT, DEAT, etc.)
  objId?: string;                      // GEDCOM object ID
  leftParts?: string[];                // Extra location parts
  validLeftParts?: string[];           // Corrected extra parts
}
```

**`FlatTownValidity`**
Same as `TownValidity` but with `validTown` as string (not array).

**`Place`**

```typescript
{
  key: string;        // Event type tag
  index: number;      // Position in list
  obj?: Common;       // Parent GEDCOM object
  ref?: Common;       // Specific place reference
  place?: string;     // Place string value
}
```

### Enums

**`PlaceType`**

```typescript
enum PlaceType {
  All = "ALL",           // All event types
  Birth = "BIRT",        // Birth events
  Marriage = "MARR",     // Marriage events
  Death = "DEAT",        // Death events
  Events = "EVEN",       // General events
  Military = "_MILT"     // Military service events
  MilitaryId = "_MILTID"     // Military id
}
```

### Internal Types

**`PrimitiveRange`**

```typescript
`-${number}` | `${number}-` | `${number}-${number}` | "-";
```

String literal type representing time ranges:

- `"-"`: All time
- `"-1875"`: Until 1875
- `"1876-"`: From 1876 onwards
- `"1876-1949"`: From 1876 to 1949

**`Town`** (Input)

```typescript
{
  leftParts?: string[];
  county?: string;
  town: string | string[];    // Can be string or array
  country?: string;
}
```

**`PureTown`** (Internal)

```typescript
{
  county?: string;
  town: string[];              // Always array
  country?: string;
  leftParts?: string[];
}
```

**`TownData`**

```typescript
{
	response: "Not found" | "No date set" | "Valid" | "Invalid";
	townResponse: "Not found" | "No date set" | "Valid" | "Invalid";
	countyResponse: "Not found" | "No date set" | "Valid" | "Invalid";
	countryResponse: "Not found" | "No date set" | "Valid" | "Invalid";
	range: PrimitiveRange;
	// ... plus all fields from Town
}
```

## Usage Examples

### Basic Usage

#### Parse Towns Configuration

```typescript
import { parseTowns } from "./get-places";
import townsData from "../../sources/towns.json";

// Parse with default configuration
const parsedTowns = parseTowns(townsData);

// Access a specific town
const rakosliget = parsedTowns["Rákosliget"];
// Returns all time ranges with county information
```

#### Get County for Specific Year

```typescript
import { getValidCountyByTownAndYear } from "./get-places";

// Check county for a birth in 1920
const result = getValidCountyByTownAndYear(
	"Rákosliget, Pest-Pilis-Solt-Kiskun, Hungary",
	1920
);

console.log(result[0].county); // "Pest-Pilis-Solt-Kiskun"
console.log(result[0].response); // "Valid" or "Invalid"
console.log(result[0].range); // "1907-1949"
```

#### Parse Place String

```typescript
import { getPlaceParts } from "./get-places";

const parts = getPlaceParts("Rákosliget, Pest-Pilis-Solt-Kiskun, Hungary");

console.log(parts.town); // "Rákosliget"
console.log(parts.county); // "Pest-Pilis-Solt-Kiskun"
console.log(parts.country); // "Hungary"
console.log(parts.leftParts); // [] (no additional parts)
```

### Advanced Usage

#### Validate All Places in GEDCOM

```typescript
import { placesValidator } from "./get-places";

const validation = placesValidator(
	gedcom,
	townsConfig,
	["Hungary", "Austria"], // Filter by countries
	["Budapest", "Pest"], // Filter by towns
	indiKeys // Filter by individuals
);

// Check for common issues
console.log(validation.townsCount); // Total invalid places
console.log(validation.missingCountries); // Places without country
console.log(validation.commonMistakes); // Likely typos

// Detailed validation for specific place
const detailedErrors = validation.towns["Budapest, Pest, Hungary"];
```

#### Extract Places from Individual

```typescript
import { getPlaces, PlaceType } from "./get-places";

// Get all birth places
const birthPlaces = getPlaces(individual, PlaceType.Birth);

// Get multiple event types
const lifeEvents = getPlaces(individual, [
	PlaceType.Birth,
	PlaceType.Death,
	PlaceType.Marriage,
]);

// Get all events (including custom)
const allPlaces = getPlaces(individual, PlaceType.All);

// Process extracted places
birthPlaces.forEach((place) => {
	console.log(`Event: ${place.key}`);
	console.log(`Place: ${place.place}`);
	console.log(`Index: ${place.index}`);
});
```

#### Get Current Name of Historical Town

```typescript
import { getCurrentNameOfTown } from "./get-places";

// Get modern name for historical place
const current = getCurrentNameOfTown(
	"Rákosliget, Pest-Pilis-Solt-Kiskun, Hungary"
);

// May return multiple current representations
current?.forEach((representation) => {
	console.log(representation.town); // Current town name
	console.log(representation.county); // Current county
	console.log(representation.country); // Current country
});
```

#### Guess Missing Information

```typescript
import { guessTown } from "./get-places";

// Try to identify town from name only
const guess = guessTown("Rákosliget", 1920);

if (guess) {
	console.log(guess.county); // "Pest-Pilis-Solt-Kiskun"
	console.log(guess.country); // "Hungary"
}

// Works with historical context
const oldGuess = guessTown("Pozsony", 1900); // Before 1920
// Returns Slovak location data
```

### Working with Validation Results

#### Check Validity

```typescript
import { isSame, isWarning, isNotFound } from "./get-places";

const validity: FlatTownValidity = {
	invalidTown: "Budapest",
	validTown: "Budapest",
	invalidCounty: "Pest",
	validCounty: "Pest-Pilis-Solt-Kiskun",
	// ... other fields
};

// Check if place needs correction
if (!isSame(validity)) {
	console.log("Place needs correction");

	// Check severity
	if (isWarning(validity.countyResponse)) {
		console.log("Warning level issue");
	}

	if (isNotFound(validity.townResponse)) {
		console.log("Town not in database");
	}
}
```

#### Case-Insensitive Comparison

```typescript
import { includesLowerCase } from "./get-places";

// Compare strings ignoring case
includesLowerCase("Budapest", "budapest"); // true

// Works with arrays
includesLowerCase(["Budapest", "Pest"], "budapest"); // true
includesLowerCase("Budapest", ["budapest", "pest"]); // true

// Array to array comparison
includesLowerCase(["Budapest", "Pest"], ["budapest"]); // true
```

## Historical Context

This module is specifically designed for Hungarian genealogical records, which present unique challenges:

### Major Historical Events

**Trianon Treaty (1920)**

- Hungary lost ~2/3 of its territory
- Many towns became part of Romania, Slovakia, Serbia, Austria
- Historical records show these towns as Hungarian before 1920
- Module handles country changes based on date

**Administrative Reforms**

- **1876**: Major county reorganization (Pest-Pilis-Solt merged with Kiskun)
- **1886**: Further consolidations
- **1918-1920**: Post-WWI territorial changes
- **1950**: Communist-era reorganization
- **1990s**: Post-communist boundary changes

**Budapest Formation**

- **1873**: Buda, Pest, and Óbuda merged into Budapest
- Multiple suburban incorporations over time
- **1950**: Major suburban annexation (17 towns including Rákosliget, Rákoshegy)

### Naming Conventions

**Hungarian → International**

- Pozsony → Bratislava (Slovakia)
- Kassa → Košice (Slovakia)
- Kolozsvár → Cluj-Napoca (Romania)
- Nagyvárad → Oradea (Romania)

**County Name Changes**

- Pest-Pilis-Solt (pre-1876) → Pest-Pilis-Solt-Kiskun (1876-1949)
- Individual counties → Budapest (1950 for incorporated suburbs)

### Supported Countries

The module recognizes multiple country name variations:

- **Hungary**: Magyarország, Hungary, Ungarn
- **Austria-Hungary**: Osztrák-Magyar Monarchia
- **Romania**: Románia, Romania, Rumänien
- **Slovakia**: Szlovákia, Slovakia, Slowakei
- **Serbia**: Szerbia, Serbia, Serbien
- And many more (see `hu-countries.json`)

### Time Period Considerations

**Pre-1876**: Original Hungarian county structure
**1876-1920**: Consolidated counties, still Austria-Hungary
**1920-1945**: Trianon borders (reduced Hungary)
**1945-1990**: Communist era (further reorganizations)
**1990-present**: Modern Hungary

## Dependencies

- `../../classes/gedcom/classes/common`: GEDCOM Common class for data structures
- `../../classes/gedcom/classes/gedcom`: Main GEDCOM parser and container
- `../../classes/gedcom/classes/list`: List implementation for GEDCOM collections
- `../../classes/gedcom/classes/date`: CommonDate class for date handling
- `../../types/types`: TypeScript type definitions (IndiKey, Tag, etc.)
- `../../translation/*-countries.json`: Country name translations for various languages
- `../../sources/hungary/*`: Hungarian-specific place data (counties, towns, detailed configs)
- `../../sources/hu-counties.json`: Legacy Hungarian county data (for backward compatibility)
- `./country-registry.ts`: Central registry for managing country-specific data
- `../range`: Range utilities (inRange, splitRange, PrimitiveRange type)
- `js-levenshtein`: Levenshtein distance algorithm for typo detection

## File Organization

The module uses a country-based file organization. **All legacy Hungarian files in the root sources/ directory have been removed** to eliminate Hungarian-specific fallbacks:

```
src/
├── sources/
│   └── hungary/              # Hungarian-specific data
│       ├── counties.json     # Hungarian counties with time periods
│       ├── towns-2020.json   # Modern Hungarian towns (2020 data)
│       ├── towns-1913.json   # Historical towns (1913 data)
│       └── towns-detailed.json  # Detailed town configurations with ranges
├── translation/
│   ├── en-countries.json     # English country translations
│   ├── de-countries.json     # German country translations
│   ├── fr-countries.json     # French country translations
│   ├── es-countries.json     # Spanish country translations
│   └── hu-countries.json     # Hungarian country translations
└── utils/
    └── get-places/
        ├── country-registry.ts  # Country registry module
        ├── index.ts             # Main module (country-specific, no fallbacks)
        ├── sources.ts           # Empty - no default sources
        └── types.ts             # Type definitions

```

**Important Changes:**

- ❌ Removed: `hu-counties.json`, `hu-towns.json`, `hu-old-towns-list.json`, `towns.json` from root sources/
- ✅ All data is now country-specific under `sources/<country-code>/`
- ✅ `sources.ts` no longer provides Hungarian fallback data
- ✅ Functions require explicit country code - no implicit defaults

## Configuration Files

**<country-code>/towns-detailed.json**
Main configuration file defining towns with their historical administrative changes. Each country has its own file:

```json
{
	"TownName": {
		"-1875": "OldCounty",
		"1876-1949": "NewCounty",
		"1950-": {
			"county": "ModernCounty",
			"town": "ModernName"
		},
		"names": ["Alias1", "Alias2"]
	}
}
```

**<country-code>/counties.json**
Maps county names to their time periods for the specific country:

```json
{
	"Pest-Pilis-Solt-Kiskun": "1876-1949",
	"Pest-Pilis-Solt": "1261-1880,1945–50"
}
```

**<country-code>/towns-2020.json** & **<country-code>/towns-1913.json**
Quick lookup databases for town → county mapping with year-specific data:

```json
{
	"TownName": {
		"county": "CountyName"
	}
}
```

**hu-countries.json**
Country name translations and variations:

```json
{
	"Hungary": "Magyarország",
	"Austria": "Ausztria"
}
```

## Performance Considerations

### Caching

- Parsed town data cached globally
- County lookups cached by "town-year" key
- Place parsing results cached by input string
- Cache survives across function calls in same session

### Memory Usage

- Full town database loaded at module import
- Parsed structures kept in memory
- Cache grows with unique lookups
- Consider clearing cache for long-running processes

### Optimization Tips

1. Reuse `parseTowns()` result instead of calling multiple times
2. Pass custom config to avoid reparsing default towns.json
3. Use `getValidCountyByTownAndYear` for single lookups
4. Use `placesValidator` for bulk validation (more efficient)
5. Cache external to module for server-side applications

## Common Patterns

### Pattern 1: Validate and Correct Place

```typescript
const results = getValidCountyByTownAndYear(place, year);
const valid = results.find((r) => r.response === "Valid");

if (valid) {
	const correctedPlace = [valid.town, valid.county, valid.country]
		.filter(Boolean)
		.join(", ");
}
```

### Pattern 2: Bulk Validation with Details

```typescript
const validation = placesValidator(gedcom);

Object.entries(validation.towns).forEach(([place, individuals]) => {
	Object.entries(individuals).forEach(([indiKey, validities]) => {
		validities.forEach((validitySet) => {
			validitySet.forEach((validity) => {
				if (!isSame(validity)) {
					console.log(`${indiKey}: ${place} → ${validity.validTown}`);
				}
			});
		});
	});
});
```

### Pattern 3: Historical Research

```typescript
// Track how a town changed over time
const town = "Rákosliget";
const parsed = parseTowns();
const ranges = parsed[town];

Object.entries(ranges)
	.filter(([key]) => key !== "names")
	.sort()
	.forEach(([range, data]) => {
		console.log(`${range}: ${data[0].county} (${data[0].town})`);
	});
```

### Pattern 4: Find Related Towns

```typescript
const parentName = "Rákoskeresztúr";
const parsed = parseTowns();

// Find all children of a parent
const children = Object.entries(parsed)
	.filter(([name, ranges]) =>
		Object.values(ranges).some((entries) =>
			entries.some((e) => e.town?.includes(parentName))
		)
	)
	.map(([name]) => name);
```

## Implementation Notes

### Design Decisions

**Why Three Processing Phases?**

1. **Phase 1**: Establishes baseline from source data
2. **Phase 2a**: Discovers implicit relationships (children mentioned but not defined)
3. **Phase 2b**: Adds historical depth (range inheritance for settlement towns)
4. **Phase 2c**: Completes bidirectional relationships (updates parents with children)

This separation allows each phase to work with clean, consistent data from previous phases.

**Why Town Arrays?**
Towns are always stored as arrays internally because:

- A range might represent merger of multiple towns
- Enables consistent processing logic
- Simplifies parent-child relationship tracking
- Supports scenarios where town had multiple names simultaneously

**Why Cache Everything?**

- GEDCOM validation often checks same places repeatedly
- Town parsing is computationally expensive
- Range lookups happen frequently
- Trade memory for speed (appropriate for genealogy apps)

### Edge Cases Handled

**1. Circular References**
Example: A → B, B → A

- Detection: Track visited nodes in parent-child traversal
- Solution: Process explicit keys first, skip if already processed

**2. Multiple Parents**
Example: Town points to multiple towns in same range

- Interpretation: Merger/composition, not parent-child
- Handling: Requires ALL towns in array, not treated as settlement

**3. Missing Parent**
Example: Child points to parent not in database

- Behavior: Silently skip, don't create phantom parent
- Rationale: Might be intentional (external reference)

**4. Overlapping Ranges**
Example: Child has 1900-1950, parent updated creates 1900-1925

- Resolution: Child's original range takes precedence
- Parent splitting doesn't overwrite child's data

**5. Year Boundary Ambiguity**
Example: Range ends 1906, child independent from 1907

- Convention: Separation year = end year + 1
- Range boundaries are inclusive
- Year boundary marks start of NEW state

### Debugging Tips

**Enable Debug Output**

```typescript
// Check what parseTowns produces
const parsed = parseTowns();
console.log(JSON.stringify(parsed["TownName"], null, 2));
```

**Trace Range Inheritance**

```typescript
// Before and after for settlement towns
const source = townsData["Rákosliget"];
const parsed = parseTowns()["Rákosliget"];
console.log("Source:", source);
console.log("Parsed:", parsed);
```

**Validate Specific Year**

```typescript
const results = getValidCountyByTownAndYear("Town, County, Country", 1920);
results.forEach((r) => {
	console.log(`Range: ${r.range}`);
	console.log(`County: ${r.county}`);
	console.log(`Status: ${r.response}`);
});
```

**Check Cache State**
The cache is internal, but you can check if parsing happened:

```typescript
// First call: parses and caches
const result1 = parseTowns(config);

// Second call with same config: returns cached
const result2 = parseTowns(config);

console.log(result1 === result2); // true (same object reference)
```

## Troubleshooting

### "Town not found"

- Check spelling (case-sensitive for lookups)
- Verify town is in `towns.json` or `hu-towns.json`
- Try `guessTown()` to see if it's in quick-lookup database
- May need to add to configuration

### "Invalid county for year"

- Town data might be incomplete
- Check if range covers the specific year
- Look at parsed result to see actual ranges
- May need to add historical range to `towns.json`

### "Place parsing incorrect"

- Check if county name contains comma (needs special handling)
- Verify country is in `hu-countries.json`
- Check county regex pattern matches format
- Review `getPlaceParts()` output

### Performance Issues

- Too many uncached lookups
- Large GEDCOM with many places
- Consider pre-parsing and storing results
- Use bulk validation instead of individual checks

### Memory Leaks

- Cache grows unbounded in long-running processes
- Not currently a concern for typical desktop app
- For server: Consider periodic cache clearing
- Module re-import clears cache (restart process)
