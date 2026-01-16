import { detectGedcomVersion } from "../utils/version-detector";
import { textFileLoader } from "./test-utils";

const mockGedcom5 = textFileLoader("src/__tests__/mocks/mock.ged");
const mockGedcom7 = textFileLoader("src/__tests__/mocks/mock-gedcom7.ged");

describe("GEDCOM Version Detection", () => {
	describe("detectGedcomVersion", () => {
		it("should detect GEDCOM 5.5.1", () => {
			const version = detectGedcomVersion(mockGedcom5);
			expect(version).toBe(5);
		});

		it("should detect GEDCOM 7.0", () => {
			const version = detectGedcomVersion(mockGedcom7);
			expect(version).toBe(7);
		});

		it("should detect GEDCOM 7.x", () => {
			const content = `0 HEAD
1 GEDC
2 VERS 7.0.5
0 TRLR`;
			const version = detectGedcomVersion(content);
			expect(version).toBe(7);
		});

		it("should detect GEDCOM 5.5", () => {
			const content = `0 HEAD
1 GEDC
2 VERS 5.5
0 TRLR`;
			const version = detectGedcomVersion(content);
			expect(version).toBe(5);
		});

		it("should return undefined for missing version", () => {
			const content = `0 HEAD
1 SOUR Test
0 TRLR`;
			const version = detectGedcomVersion(content);
			expect(version).toBeUndefined();
		});

		it("should handle whitespace variations", () => {
			const content = `0 HEAD
1 GEDC
2  VERS   7.0
0 TRLR`;
			const version = detectGedcomVersion(content);
			expect(version).toBe(7);
		});

		it("should handle multiple tags under GEDC", () => {
			const content = `0 HEAD
1 GEDC
2 FORM LINEAGE-LINKED
2 VERS 7.0
0 TRLR`;
			const version = detectGedcomVersion(content);
			expect(version).toBe(7);
		});

		it("should handle VERS not being first under GEDC", () => {
			const content = `0 HEAD
1 GEDC
2 FORM LINEAGE-LINKED
2 LANG EN
2 VERS 5.5.1
2 PLAC UTF-8
0 TRLR`;
			const version = detectGedcomVersion(content);
			expect(version).toBe(5);
		});
	});
});
