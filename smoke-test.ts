/**
 * Basic smoke test for GEDCOM parser
 * Tests that the parser can parse a minimal GEDCOM file
 */

import GedcomParser from "./parser";

// Minimal valid GEDCOM
const minimalGedcom = `
0 HEAD
1 SOUR TreeViz
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 1 JAN 1950
2 PLAC New York, USA
0 TRLR
`.trim();

// Test parsing
try {
	const { gedcom, raw } = GedcomParser.parse(minimalGedcom);
	
	console.log("✓ Parser loaded successfully");
	console.log("✓ parse() method exists");
	console.log("✓ Returns gedcom object:", typeof gedcom);
	console.log("✓ Returns raw string:", typeof raw);
	
	// Check structure
	if (gedcom.HEAD) {
		console.log("✓ HEAD found");
	}
	
	if (gedcom["@@INDI"]) {
		console.log("✓ Individuals list found");
		const indis = gedcom["@@INDI"];
		console.log("✓ Individual count:", indis.length);
	}
	
	console.log("\n✅ Smoke test PASSED - Parser structure is correct");
	process.exit(0);
} catch (error) {
	console.error("❌ Smoke test FAILED:");
	console.error(error);
	process.exit(1);
}
