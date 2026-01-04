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
	});
});
