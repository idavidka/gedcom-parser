import {
	createCommon,
	Common,
	GedCom,
	IndiType,
	List,
} from "../classes";
import GedcomTree from "..";

import { textFileLoader } from "./test-utils";
import microJsonExported from "./mocks/export-indi-and-refs.json";

const microGedcom = textFileLoader("src/__tests__/mocks/indi-and-refs.ged");
const microGedcomExported = textFileLoader(
	"src/__tests__/mocks/export-indi-and-refs.ged"
);

const mergingGedcom = textFileLoader("src/__tests__/mocks/merging-indis.ged");
const mergingGedcomExported = textFileLoader(
	"src/__tests__/mocks/export-merging-indis.ged"
);
const mergingWithRemovingGedcomExported = textFileLoader(
	"src/__tests__/mocks/export-merging-indis-with-removing.ged"
);
const cloningGedcomExported = textFileLoader(
	"src/__tests__/mocks/export-cloning-indis.ged"
);

describe("GEDCOM Common Class Functionality", () => {
	describe("Path Notation Equivalence", () => {
		const sampleGedcom = `0 HEAD
1 SOUR Family Tree Visualiser
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
2 GIVN John
2 SURN Doe
1 SEX M
1 BIRT
2 DATE 15 JAN 1990
3 YEAR 1990
3 MONTH JAN
3 DAY 15
2 PLAC New York, USA
3 CITY New York
3 STATE New York
3 CTRY USA
1 BIRT
2 DATE ABT 1989
3 YEAR 1989
2 PLAC Boston, USA
1 DEAT
2 DATE 25 DEC 2050
2 PLAC California, USA
0 TRLR`;

		// Sample GEDCOM with ONE BIRT having TWO DATE entries
		const sampleGedcomWithMultipleDates = `0 HEAD
1 SOUR Family Tree Visualiser
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jane /Smith/
2 GIVN Jane
2 SURN Smith
1 SEX F
1 BIRT
2 DATE 20 MAR 1985
3 YEAR 1985
3 MONTH MAR
3 DAY 20
2 DATE ABT 1984
3 YEAR 1984
2 PLAC London, England
3 CITY London
3 CTRY England
1 DEAT
2 DATE 10 JUL 2060
2 PLAC Paris, France
0 TRLR`;

		let gedcom: GedCom;
		let individual: IndiType | undefined;

		beforeEach(() => {
			const { gedcom: parsedGedcom } = GedcomTree.parse(sampleGedcom, {});
			gedcom = parsedGedcom;
			individual = gedcom.indi("@I1@");
		});

		it("should return same value for get('BIRT.DATE.YEAR'), get('BIRT.0.DATE.0.YEAR'), get('BIRT.items[0].DATE.YEAR')", () => {
			const dotNotation = individual?.get("BIRT.DATE.YEAR");
			const indexedNotation = individual?.get("BIRT.0.DATE.0.YEAR");
			const arrayNotation = individual?.get("BIRT.items[0].DATE.YEAR");

			expect(dotNotation?.toValue()).toBe("1990");
			expect(indexedNotation?.toValue()).toBe("1990");
			expect(arrayNotation?.toValue()).toBe("1990");

			// All should return the same value
			expect(dotNotation?.toValue()).toEqual(indexedNotation?.toValue());
			expect(dotNotation?.toValue()).toEqual(arrayNotation?.toValue());
			expect(indexedNotation?.toValue()).toEqual(
				arrayNotation?.toValue()
			);
		});

		it("should return same value for get('BIRT.DATE'), get('BIRT.0.DATE.0'), get('BIRT.items[0].DATE')", () => {
			const dotNotation = individual?.get("BIRT.DATE");
			const indexedNotation = individual?.get("BIRT.0.DATE.0");
			const arrayNotation = individual?.get("BIRT.items[0].DATE");

			expect(dotNotation?.toValue()).toBe("15 Jan 1990");
			expect(indexedNotation?.toValue()).toBe("15 Jan 1990");
			expect(arrayNotation?.toValue()).toBe("15 Jan 1990");

			// All should return the same value
			expect(dotNotation?.toValue()).toEqual(indexedNotation?.toValue());
			expect(dotNotation?.toValue()).toEqual(arrayNotation?.toValue());
			expect(indexedNotation?.toValue()).toEqual(
				arrayNotation?.toValue()
			);
		});

		it("should return same value for get('BIRT.PLAC'), get('BIRT.0.PLAC.0'), get('BIRT.items[0].PLAC')", () => {
			const dotNotation = individual?.get("BIRT.PLAC");
			const indexedNotation = individual?.get("BIRT.0.PLAC.0");
			const arrayNotation = individual?.get("BIRT.items[0].PLAC");

			expect(dotNotation?.toValue()).toBe("New York, USA");
			expect(indexedNotation?.toValue()).toBe("New York, USA");
			expect(arrayNotation?.toValue()).toBe("New York, USA");

			// All should return the same value
			expect(dotNotation?.toValue()).toEqual(indexedNotation?.toValue());
			expect(dotNotation?.toValue()).toEqual(arrayNotation?.toValue());
			expect(indexedNotation?.toValue()).toEqual(
				arrayNotation?.toValue()
			);
		});

		it("should return same value for get('NAME.GIVN'), get('NAME.0.GIVN.0'), get('NAME.items[0].GIVN')", () => {
			const dotNotation = individual?.get("NAME.GIVN");
			const indexedNotation = individual?.get("NAME.0.GIVN.0");
			const arrayNotation = individual?.get("NAME.items[0].GIVN");

			expect(dotNotation?.toValue()).toBe("John");
			expect(indexedNotation?.toValue()).toBe("John");
			expect(arrayNotation?.toValue()).toBe("John");

			// All should return the same value
			expect(dotNotation?.toValue()).toEqual(indexedNotation?.toValue());
			expect(dotNotation?.toValue()).toEqual(arrayNotation?.toValue());
			expect(indexedNotation?.toValue()).toEqual(
				arrayNotation?.toValue()
			);
		});

		it("should handle multiple BIRT events with different notations", () => {
			// Test second BIRT event
			const secondBirtDate1 = individual?.get("BIRT.1.DATE");
			const secondBirtDate2 = individual?.get("BIRT.items[1].DATE");

			expect(secondBirtDate1?.toValue()).toBe("ABT 1989");
			expect(secondBirtDate2?.toValue()).toBe("ABT 1989");
			expect(secondBirtDate1?.toValue()).toEqual(
				secondBirtDate2?.toValue()
			);

			// Test second BIRT year
			const secondBirtYear1 = individual?.get("BIRT.1.DATE.YEAR");
			const secondBirtYear2 = individual?.get("BIRT.items[1].DATE.YEAR");

			expect(secondBirtYear1?.toValue()).toBe("1989");
			expect(secondBirtYear2?.toValue()).toBe("1989");
			expect(secondBirtYear1?.toValue()).toEqual(
				secondBirtYear2?.toValue()
			);
		});

		it("should handle deep nested paths with all notations", () => {
			// Test BIRT.PLAC.CITY with different notations
			const dotNotation = individual?.get("BIRT.PLAC.CITY");
			const indexedNotation = individual?.get("BIRT.0.PLAC.0.CITY.0");
			const arrayNotation = individual?.get(
				"BIRT.items[0].PLAC.items[0].CITY"
			);

			expect(dotNotation?.toValue()).toBe("New York");
			expect(indexedNotation?.toValue()).toBe("New York");
			expect(arrayNotation?.toValue()).toBe("New York");

			// All should return the same value
			expect(dotNotation?.toValue()).toEqual(indexedNotation?.toValue());
			expect(dotNotation?.toValue()).toEqual(arrayNotation?.toValue());
			expect(indexedNotation?.toValue()).toEqual(
				arrayNotation?.toValue()
			);
		});

		it("should return undefined for non-existent paths in all notations", () => {
			const dotNotation = individual?.get("BIRT.DATE.HOUR");
			const indexedNotation = individual?.get("BIRT.0.DATE.0.HOUR");
			const arrayNotation = individual?.get("BIRT.items[0].DATE.HOUR");

			expect(dotNotation).toBeUndefined();
			expect(indexedNotation).toBeUndefined();
			expect(arrayNotation).toBeUndefined();
		});

		describe("BIRT with multiple DATE entries", () => {
			let gedcomMultipleDates: GedCom;
			let individualMultipleDates: IndiType | undefined;

			beforeEach(() => {
				const { gedcom: parsedGedcom } = GedcomTree.parse(
					sampleGedcomWithMultipleDates,
					{}
				);
				gedcomMultipleDates = parsedGedcom;
				individualMultipleDates = gedcomMultipleDates.indi("@I1@");
			});

			it("should return same value for first DATE: get('BIRT.DATE.YEAR'), get('BIRT.0.DATE.0.YEAR'), get('BIRT.items[0].DATE.YEAR')", () => {
				const dotNotation =
					individualMultipleDates?.get("BIRT.DATE.YEAR");
				const indexedNotation =
					individualMultipleDates?.get("BIRT.0.DATE.0.YEAR");
				const arrayNotation = individualMultipleDates?.get(
					"BIRT.items[0].DATE.YEAR"
				);

				expect(dotNotation?.toValue()).toBe("1985");
				expect(indexedNotation?.toValue()).toBe("1985");
				expect(arrayNotation?.toValue()).toBe("1985");

				// All should return the same value
				expect(dotNotation?.toValue()).toEqual(
					indexedNotation?.toValue()
				);
				expect(dotNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
				expect(indexedNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
			});

			it("should return same value for second DATE: get('BIRT.DATE.1.YEAR'), get('BIRT.0.DATE.1.YEAR'), get('BIRT.items[0].DATE.items[1].YEAR')", () => {
				const dotNotation =
					individualMultipleDates?.get("BIRT.DATE.1.YEAR");
				const indexedNotation =
					individualMultipleDates?.get("BIRT.0.DATE.1.YEAR");
				const arrayNotation = individualMultipleDates?.get(
					"BIRT.items[0].DATE.items[1].YEAR"
				);

				expect(dotNotation?.toValue()).toBe("1984");
				expect(indexedNotation?.toValue()).toBe("1984");
				expect(arrayNotation?.toValue()).toBe("1984");

				// All should return the same value
				expect(dotNotation?.toValue()).toEqual(
					indexedNotation?.toValue()
				);
				expect(dotNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
				expect(indexedNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
			});

			it("should return same value for first DATE: get('BIRT.DATE'), get('BIRT.0.DATE.0'), get('BIRT.items[0].DATE.items[0]')", () => {
				const dotNotation = individualMultipleDates?.get("BIRT.DATE");
				const indexedNotation =
					individualMultipleDates?.get("BIRT.0.DATE.0");
				const arrayNotation = individualMultipleDates?.get(
					"BIRT.items[0].DATE.items[0]"
				);

				expect(dotNotation?.toValue()).toBeInstanceOf(List);
				expect(dotNotation?.toValue()?.index(0)).toBe("20 Mar 1985");
				expect(indexedNotation?.toValue()).toBe("20 Mar 1985");
				expect(arrayNotation?.toValue()).toBe("20 Mar 1985");

				// All should return the same value
				expect(dotNotation?.toValue()?.index(0)).toEqual(
					indexedNotation?.toValue()
				);
				expect(dotNotation?.toValue()?.index(0)).toEqual(
					arrayNotation?.toValue()
				);
				expect(indexedNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
			});

			it("should return same value for second DATE: get('BIRT.DATE.1'), get('BIRT.0.DATE.1'), get('BIRT.items[0].DATE.items[1]')", () => {
				const dotNotation = individualMultipleDates?.get("BIRT.DATE.1");
				const indexedNotation =
					individualMultipleDates?.get("BIRT.0.DATE.1");
				const arrayNotation = individualMultipleDates?.get(
					"BIRT.items[0].DATE.items[1]"
				);

				expect(dotNotation?.toValue()).toBe("ABT 1984");
				expect(indexedNotation?.toValue()).toBe("ABT 1984");
				expect(arrayNotation?.toValue()).toBe("ABT 1984");

				// All should return the same value
				expect(dotNotation?.toValue()).toEqual(
					indexedNotation?.toValue()
				);
				expect(dotNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
				expect(indexedNotation?.toValue()).toEqual(
					arrayNotation?.toValue()
				);
			});
		});
	});

	describe("Common Object Creation", () => {
		it("should return with a new Common", () => {
			const common = createCommon();

			expect(common).toBeInstanceOf(Common);
		});
	});

	it("should have id", () => {
		const tesztId = "@I1@";
		const common = new Common(undefined, tesztId);

		expect(common).toHaveProperty("_id");
		expect(common.id).toEqual(tesztId);
	});

	it("should not have id", () => {
		const common = new Common();

		expect(common).not.toHaveProperty("_id");
	});

	it("should have a set a value", () => {
		const common = createCommon();
		const name = createCommon();
		name.value = "Test";
		common.set("NAME", name);

		expect(common.get("NAME")).toHaveProperty("value");
		expect(common.get("NAME")?.toString()).toEqual("Test");
		expect(common.get("NAME")?.toValue()).toEqual("Test");
	});

	describe("Export Functionality", () => {
		const { gedcom: testGedcom } = GedcomTree.parse(microGedcom, {});
		it("toGedcom should match", () => {
			expect(testGedcom).toBeInstanceOf(GedCom);
			const gedcomString = testGedcom.toGedcom(undefined, undefined, {
				original: true,
			});

			expect(gedcomString).toEqual(microGedcomExported);
		});

		it("toJson should match", () => {
			expect(testGedcom).toBeInstanceOf(GedCom);
			const json = JSON.parse(testGedcom.toJson());

			expect(json).toMatchObject(microJsonExported);
		});
	});

	describe("Object Merging", () => {
		it("toGedcom should match", () => {
			const { gedcom: testGedcom } = GedcomTree.parse(mergingGedcom);
			expect(testGedcom).toBeInstanceOf(GedCom);

			testGedcom.mergeIndis("@indi1@", "@indi2@", false);

			const gedcomString = testGedcom.toGedcom(undefined, undefined, {
				original: true,
			});

			expect(gedcomString).toEqual(mergingGedcomExported);
		});
	});

	describe("Merge with Source Removal", () => {
		it("toGedcom should match", () => {
			const { gedcom: testGedcom } = GedcomTree.parse(mergingGedcom);
			expect(testGedcom).toBeInstanceOf(GedCom);

			testGedcom.mergeIndis("@indi1@", "@indi2@");

			const gedcomString = testGedcom.toGedcom(undefined, undefined, {
				original: true,
			});

			expect(gedcomString).toEqual(mergingWithRemovingGedcomExported);
		});
	});

	describe("Object Cloning", () => {
		it("toGedcom should match", () => {
			const { gedcom: testGedcom } = GedcomTree.parse(mergingGedcom);
			expect(testGedcom).toBeInstanceOf(GedCom);

			testGedcom.cloneIndis("@indi1@", "@indi2@");

			const gedcomString = testGedcom.toGedcom(undefined, undefined, {
				original: true,
			});

			expect(gedcomString).toEqual(cloningGedcomExported);
		});
	});
});
