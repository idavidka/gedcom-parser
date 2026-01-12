import GedcomTree from "../index";
import { textFileLoader } from "./test-utils";

const mockGedcom5 = textFileLoader("src/__tests__/mocks/mock.ged");
const mockGedcom7 = textFileLoader("src/__tests__/mocks/mock-gedcom7.ged");

describe("GEDCOM Version Parsing", () => {
	describe("GEDCOM 5 Parsing", () => {
		it("should parse GEDCOM 5.5.1 file correctly", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);

			expect(gedcom).toHaveProperty("HEAD");
			expect(gedcom).toHaveProperty("@@INDI");
			expect(gedcom).toHaveProperty("@@FAM");
			
			// Verify version is 5.5.1
			const version = gedcom.HEAD?.GEDC?.VERS?.value;
			expect(version).toBe("5.5.1");
		});

		it("should maintain backward compatibility", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const indis = gedcom.indis();
			
			expect(indis).toBeDefined();
			expect(indis?.length).toBeGreaterThan(0);
		});
	});

	describe("GEDCOM 7 Parsing", () => {
		it("should parse GEDCOM 7.0 file correctly", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);

			expect(gedcom).toHaveProperty("HEAD");
			expect(gedcom).toHaveProperty("@@INDI");
			expect(gedcom).toHaveProperty("@@FAM");
			
			// Verify version is 7.0
			const version = gedcom.HEAD?.GEDC?.VERS?.value;
			expect(version).toBe("7.0");
		});

		it("should produce same GedcomType structure as GEDCOM 5", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const indis = gedcom.indis();
			
			expect(indis).toBeDefined();
			expect(indis?.length).toBe(2);
			
			const indi1 = indis?.index(0);
			expect(indi1?.NAME?.toValue()).toContain("John");
			expect(indi1?.SEX?.value).toBe("M");
		});

		it("should handle GEDCOM 7 family structures", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const fams = gedcom.fams();
			
			expect(fams).toBeDefined();
			expect(fams?.length).toBe(1);
			
			const fam1 = fams?.index(0);
			expect(fam1?.HUSB?.value).toBe("@I1@");
			expect(fam1?.WIFE?.value).toBe("@I2@");
		});

		it("should handle GEDCOM 7 SCHMA tag", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const schma = gedcom.HEAD?.SCHMA;
			
			expect(schma).toBeDefined();
		});
	});

	describe("Version Detection Integration", () => {
		it("should automatically detect and use correct parser", () => {
			const gedcom5Result = GedcomTree.parse(mockGedcom5);
			const gedcom7Result = GedcomTree.parse(mockGedcom7);
			
			expect(gedcom5Result.gedcom.HEAD?.GEDC?.VERS?.value).toBe("5.5.1");
			expect(gedcom7Result.gedcom.HEAD?.GEDC?.VERS?.value).toBe("7.0");
		});
	});
});
