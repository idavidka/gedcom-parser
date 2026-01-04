import GedcomTree from "..";
import { textFileLoader } from "./test-utils";
import { List } from "../classes";

const mock = textFileLoader("src/__tests__/mocks/mock.ged");

describe("List Class Functionality", () => {
	const { gedcom: testGedcom } = GedcomTree.parse(mock);

	describe("Basic List Operations", () => {
		it("should create a list from individuals", () => {
			const indis = testGedcom.indis();
			expect(indis).toBeInstanceOf(List);
			expect(indis.length).toBeGreaterThan(0);
		});

		it("should get item by index", () => {
			const indis = testGedcom.indis();
			const first = indis.index(0);
			expect(first).toBeDefined();
		});

		it("should get item by key", () => {
			const indis = testGedcom.indis();
			const keys = indis.keys();
			if (keys.length > 0) {
				const item = indis.get(keys[0]);
				expect(item).toBeDefined();
			}
		});

		it("should return first item", () => {
			const indis = testGedcom.indis();
			const first = indis.first();
			expect(first).toBeDefined();
		});

		it("should return last item", () => {
			const indis = testGedcom.indis();
			const last = indis.last();
			expect(last).toBeDefined();
		});

		it("should return undefined for invalid index", () => {
			const indis = testGedcom.indis();
			const invalid = indis.index(999999);
			expect(invalid).toBeUndefined();
		});
	});

	describe("Array-like Operations", () => {
		it("should iterate with forEach", () => {
			const indis = testGedcom.indis();
			let count = 0;
			indis.forEach(() => {
				count++;
			});
			expect(count).toBe(indis.length);
		});

		it("should map items", () => {
			const indis = testGedcom.indis();
			const ids = indis.map((indi) => indi.id);
			expect(ids.length).toBe(indis.length);
		});

		it("should reduce items", () => {
			const indis = testGedcom.indis();
			const totalCount = indis.reduce((acc) => acc + 1, 0);
			expect(totalCount).toBe(indis.length);
		});

		it("should filter items", () => {
			const indis = testGedcom.indis();
			const males = indis.filter((indi) => indi.get("SEX")?.toValue() === "M");
			expect(males.length).toBeLessThanOrEqual(indis.length);
		});

		it("should find item", () => {
			const indis = testGedcom.indis();
			const male = indis.find((indi) => indi.get("SEX")?.toValue() === "M");
			if (male) {
				expect(male.get("SEX")?.toValue()).toBe("M");
			}
		});
	});

	describe("List Manipulation", () => {
		it("should copy list", () => {
			const indis = testGedcom.indis();
			const copy = indis.copy();
			expect(copy.length).toBe(indis.length);
			expect(copy).not.toBe(indis);
		});

		it("should except item from list", () => {
			const indis = testGedcom.indis();
			const first = indis.first();
			if (first) {
				const exceptFirst = indis.except(first);
				expect(exceptFirst.length).toBe(indis.length - 1);
			}
		});
	});

	describe("Grouping", () => {
		it("should group by key function", () => {
			const indis = testGedcom.indis();
			const grouped = indis.groupBy((indi) => {
				const sex = indi.get("SEX")?.toValue();
				return sex || "Unknown";
			});
			expect(typeof grouped).toBe("object");
			expect(Object.keys(grouped).length).toBeGreaterThan(0);
		});

		it("should create nested groups", () => {
			const indis = testGedcom.indis();
			const grouped = indis.groupBy(
				(indi) => indi.get("SEX")?.toValue() || "Unknown",
				"nested"
			);
			expect(typeof grouped).toBe("object");
		});
	});

	describe("Sorting", () => {
		it("should sort with comparator", () => {
			const indis = testGedcom.indis();
			const sorted = indis.orderBy((a, keyA, b, keyB) => {
				const idA = a.id || "";
				const idB = b.id || "";
				return idA.localeCompare(idB);
			});
			expect(sorted.length).toBe(indis.length);
		});
	});

	describe("List Properties", () => {
		it("should have correct count", () => {
			const indis = testGedcom.indis();
			const count = indis.length;
			const keysLength = indis.keys().length;
			expect(count).toBe(keysLength);
		});

		it("should return all keys", () => {
			const indis = testGedcom.indis();
			const keys = indis.keys();
			expect(Array.isArray(keys)).toBe(true);
			expect(keys.length).toBeGreaterThan(0);
		});

		it("should return all values", () => {
			const indis = testGedcom.indis();
			const values = indis.values();
			expect(Array.isArray(values)).toBe(true);
			expect(values.length).toBe(indis.keys().length);
		});
	});
});
