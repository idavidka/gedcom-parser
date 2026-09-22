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

		it("parses a Geni header when a UTF-8 BOM precedes 0 HEAD", () => {
			const raw = "\uFEFF0 HEAD\n1 SOUR Geni.com\n1 CHAR UTF-8\n0 TRLR\n";
			const { gedcom } = GedcomTree.parse(raw, {
				filename: "export-geni.zip",
			});

			expect(gedcom.HEAD?.get("SOUR")?.value).toBe("Geni.com");
		});
	});
});
