import GedcomTree from "../index";
import { textFileLoader } from "./test-utils";

const mockGedcom5 = textFileLoader("src/__tests__/mocks/mock.ged");
const mockGedcom7 = textFileLoader("src/__tests__/mocks/mock-gedcom7.ged");

describe("GEDCOM Version Serialization", () => {
	describe("Default Behavior (GEDCOM 5)", () => {
		it("should default to GEDCOM 5 when no version specified", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const gedcomString = gedcom.toGedcom();
			
			// Should contain GEDCOM 5.5.1 version
			expect(gedcomString).toContain("2 VERS 5.5.1");
		});

		it("should maintain GEDCOM 5 output for GEDCOM 5 input", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom();
			
			expect(gedcomString).toContain("2 VERS 5.5.1");
		});

		it("should export valid GEDCOM 5 structure", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const gedcomString = gedcom.toGedcom();
			
			// Check for proper header structure
			expect(gedcomString).toMatch(/0 HEAD/);
			expect(gedcomString).toMatch(/1 GEDC/);
			expect(gedcomString).toMatch(/2 VERS 5\.5\.1/);
			expect(gedcomString).toMatch(/0 TRLR/);
		});
	});

	describe("GEDCOM 5 Serialization", () => {
		it("should export as GEDCOM 5 when version: 5 specified", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 5,
			});
			
			expect(gedcomString).toContain("2 VERS 5.5.1");
		});

		it("should preserve all data when converting from GEDCOM 7 to 5", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 5,
			});
			
			// Check individuals are preserved
			expect(gedcomString).toContain("@I1@");
			expect(gedcomString).toContain("John");
			expect(gedcomString).toContain("@I2@");
			expect(gedcomString).toContain("Jane");
		});
	});

	describe("GEDCOM 7 Serialization", () => {
		it("should export as GEDCOM 7 when version: 7 specified", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			expect(gedcomString).toContain("2 VERS 7.0");
		});

		it("should export valid GEDCOM 7 structure", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			// Check for proper header structure
			expect(gedcomString).toMatch(/0 HEAD/);
			expect(gedcomString).toMatch(/1 GEDC/);
			expect(gedcomString).toMatch(/2 VERS 7\.0/);
			expect(gedcomString).toMatch(/0 TRLR/);
		});

		it("should remove CHAR tag when converting to GEDCOM 7", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			// CHAR tag should not be present in GEDCOM 7
			expect(gedcomString).not.toContain("1 CHAR");
		});

		it("should remove FORM tag from GEDC when converting to GEDCOM 7", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			// FORM tag should not be present in GEDC structure in GEDCOM 7
			expect(gedcomString).not.toMatch(/2 FORM LINEAGE-LINKED/);
		});

		it("should preserve all data when converting from GEDCOM 5 to 7", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			// Check that data is preserved
			expect(gedcomString).toContain("@I38561572439@");
			expect(gedcomString).toContain("INDI");
		});

		it("should maintain GEDCOM 7 when re-exporting", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom7);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			expect(gedcomString).toContain("2 VERS 7.0");
		});
	});

	describe("Round-trip Conversion", () => {
		it("should be able to parse exported GEDCOM 5", () => {
			const { gedcom: gedcom1 } = GedcomTree.parse(mockGedcom7);
			const gedcomString = gedcom1.toGedcom(undefined, undefined, {
				version: 5,
			});
			
			const { gedcom: gedcom2 } = GedcomTree.parse(gedcomString);
			expect(gedcom2.HEAD?.GEDC?.VERS?.value).toBe("5.5.1");
		});

		it("should be able to parse exported GEDCOM 7", () => {
			const { gedcom: gedcom1 } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom1.toGedcom(undefined, undefined, {
				version: 7,
			});
			
			const { gedcom: gedcom2 } = GedcomTree.parse(gedcomString);
			expect(gedcom2.HEAD?.GEDC?.VERS?.value).toBe("7.0");
		});
	});

	describe("Backward Compatibility", () => {
		it("should not break existing toGedcom() calls without options", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom();
			
			expect(gedcomString).toBeDefined();
			expect(gedcomString.length).toBeGreaterThan(0);
		});

		it("should not break existing toGedcom() calls with original option", () => {
			const { gedcom } = GedcomTree.parse(mockGedcom5);
			const gedcomString = gedcom.toGedcom(undefined, undefined, {
				original: true,
			});
			
			expect(gedcomString).toBeDefined();
			expect(gedcomString.length).toBeGreaterThan(0);
		});
	});
});
