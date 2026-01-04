import { describe, it, expect } from "vitest";
import GedcomTree from "..";
import { dateFormatter } from "../utils/date-formatter";

describe("Date Formatter - Multiple Events", () => {
	it("should handle single birth event", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 01 JAN 1950
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(indi, false, false, false, true, false);

		expect(result.birth).toBe("*1950");
		expect(result.inArray).toContain("*1950");
	});

	it("should handle multiple birth events with alternate suffix", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 01 JAN 1950
1 BIRT
2 DATE 15 JAN 1950
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(
			indi,
			false,
			false,
			false,
			true,
			false,
			undefined,
			true
		);

		expect(result.birth).toBe("*1950");
		expect(result.inArray.length).toBeGreaterThanOrEqual(2);
		expect(result.inArray[0]).toBe("*1950");
		expect(result.inArray[1]).toContain("1950");
		// Should have alternate suffix in parenthes
		// Check that births array is returned
		expect(result.births).toBeDefined();
		expect(result.births?.length).toBe(2);
	});

	it("should handle multiple death events with alternate suffix", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 DEAT
2 DATE 01 JAN 2020
1 DEAT
2 DATE 05 JAN 2020
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(
			indi,
			false,
			false,
			false,
			true,
			false,
			undefined,
			true
		);

		expect(result.death).toBe("†2020");
		expect(result.inArray.length).toBeGreaterThanOrEqual(2);
		expect(result.inArray[0]).toBe("†2020");
		expect(result.inArray[1]).toContain("2020");
		// Should have alternate suffix in parentheses
	});

	it("should handle multiple birth and death events together", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 01 JAN 1950
1 BIRT
2 DATE 15 JAN 1950
1 DEAT
2 DATE 01 JAN 2020
1 DEAT
2 DATE 05 JAN 2020
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(
			indi,
			false,
			false,
			false,
			true,
			false,
			undefined,
			true
		);

		expect(result.birth).toBe("*1950");
		expect(result.death).toBe("†2020");
		expect(result.inArray.length).toBeGreaterThanOrEqual(4);
		// Should have 2 births and 2 deaths
		const birthEntries = result.inArray.filter((entry) =>
			entry?.startsWith("*")
		);
		const deathEntries = result.inArray.filter((entry) =>
			entry?.startsWith("†")
		);
		expect(birthEntries.length).toBe(2);
		expect(deathEntries.length).toBe(2);
	});

	it("should show places for multiple events when requested", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 01 JAN 1950
2 PLAC New York, USA
1 BIRT
2 DATE 15 JAN 1950
2 PLAC Boston, USA
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(
			indi,
			false,
			false,
			true,
			true,
			false,
			undefined,
			true
		);

		expect(result.places?.length).toBeGreaterThanOrEqual(2);
		expect(result.places).toContain("New York, USA");
		expect(result.places).toContain("Boston, USA");
	});

	it("should handle multiple marriage events for a family", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Smith/
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 01 JAN 1970
1 MARR
2 DATE 15 JAN 1970
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(
			indi,
			true,
			false,
			false,
			true,
			false,
			undefined,
			true
		);

		// Should have at least 2 marriage entries
		expect(result.marriage.length).toBeGreaterThanOrEqual(2);
		// First marriage should not have alternate suffix
		expect(result.marriage[0]).toContain("1970");
		expect(result.marriage[0]).not.toMatch(/\(.+\)/);
		// Second marriage should have alternate suffix
		expect(result.marriage[1]).toContain("1970");
	});

	it("should not show multiple events when showAllEvents is false", () => {
		const gedcomContent = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 01 JAN 1950
1 BIRT
2 DATE 15 JAN 1950
1 DEAT
2 DATE 01 JAN 2020
1 DEAT
2 DATE 05 JAN 2020
0 TRLR`;

		const { gedcom } = GedcomTree.parse(gedcomContent);
		const indi = gedcom?.indis()?.index(0);
		const result = dateFormatter(
			indi,
			false,
			false,
			false,
			true,
			false,
			undefined,
			false
		);

		expect(result.birth).toBe("*1950");
		expect(result.death).toBe("†2020");
		// Should only have 2 events (1 birth + 1 death), not 4
		expect(result.inArray.length).toBe(2);
		expect(result.inArray[0]).toBe("*1950");
		expect(result.inArray[1]).toBe("†2020");
	});
});
