import GedcomTree from "../index";
import { textFileLoader } from "./test-utils";

const mock = textFileLoader("src/__tests__/mocks/mock.ged");

describe("GEDCOM Parser Utility", () => {
	describe("Parser Core Functions", () => {
		it("should be a GedCom object", () => {
			expect(GedcomTree).toBeInstanceOf(Object);
		});

		it("should have helper functions", () => {
			expect(GedcomTree).toHaveProperty("parse");
			expect(GedcomTree).toHaveProperty("parseHierarchy");
		});

		it("should have empty result", () => {
			const { gedcom: parsed } = GedcomTree.parse("");

			expect(parsed).not.toHaveProperty("HEAD");
			expect(parsed).not.toHaveProperty("@@INDI");
			expect(parsed).not.toHaveProperty("@@FAM");
		});

		it("should parse a gedcom string", () => {
			const { gedcom: parsed } = GedcomTree.parse(mock);

			expect(parsed).toHaveProperty("HEAD");
			expect(parsed).toHaveProperty("@@INDI");
			expect(parsed).toHaveProperty("@@FAM");
		});

		it("keeps NOTE blocks unless purge is opted in with a size limit", () => {
			const raw = [
				"0 HEAD",
				"1 SOUR TreeViz",
				"1 GEDC",
				"2 VERS 5.5.1",
				"0 @I1@ INDI",
				"1 NAME John /Doe/",
				"1 NOTE secret note",
				"0 TRLR",
			].join("\n");

			const untouched = GedcomTree.parse(raw);
			expect(untouched.raw).toContain("1 NOTE secret note");
			expect(untouched.raw).not.toContain("_IS_PURGED");

			const flagOnly = GedcomTree.parse(raw, { purgeOversized: true });
			expect(flagOnly.raw).toContain("1 NOTE secret note");

			const limitOnly = GedcomTree.parse(raw, { maxFileSizeToPurge: 1 });
			expect(limitOnly.raw).toContain("1 NOTE secret note");

			const purged = GedcomTree.parse(raw, {
				purgeOversized: true,
				maxFileSizeToPurge: 1,
			});
			expect(purged.raw).not.toContain("1 NOTE secret note");
			expect(purged.raw).toContain("1 _IS_PURGED true");
		});

		it("parses a Geni header when a UTF-8 BOM precedes 0 HEAD", () => {
			const raw = "\uFEFF0 HEAD\n1 SOUR Geni.com\n1 CHAR UTF-8\n0 TRLR\n";
			const { gedcom } = GedcomTree.parse(raw, {
				filename: "export-geni.zip",
			});

			expect(gedcom.HEAD?.get("SOUR")?.value).toBe("Geni.com");
		});
	});
});
