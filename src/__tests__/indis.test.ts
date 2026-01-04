import GedcomTree from "..";
import { textFileLoader } from "./test-utils";
import { Individuals } from "../classes";

const mock = textFileLoader("src/__tests__/mocks/mock.ged");

describe("Individuals Collection Class", () => {
	const { gedcom: testGedcom } = GedcomTree.parse(mock);
	const indis = testGedcom.indis();

	describe("Collection Operations", () => {
		it("should return Individuals instance", () => {
			expect(indis).toBeInstanceOf(Individuals);
		});

		it("should have multiple individuals", () => {
			expect(indis.count()).toBeGreaterThan(0);
			expect(indis.keys().length).toBeGreaterThan(0);
		});

		it("should filter individuals", () => {
			const males = indis.filter((indi) => indi.get("SEX")?.toValue() === "M");
			expect(males).toBeInstanceOf(Individuals);
			expect(males.count()).toBeGreaterThan(0);
			expect(males.count()).toBeLessThan(indis.count());
		});

		it("should find an individual", () => {
			const firstMale = indis.find((indi) => indi.get("SEX")?.toValue() === "M");
			expect(firstMale).toBeDefined();
			expect(firstMale?.get("SEX")?.toValue()).toBe("M");
		});

		it("should copy individuals collection", () => {
			const copy = indis.copy();
			expect(copy).toBeInstanceOf(Individuals);
			expect(copy.count()).toBe(indis.count());
			expect(copy).not.toBe(indis);
		});

		it("should except an individual from collection", () => {
			const firstIndi = indis.first();
			if (firstIndi) {
				const exceptOne = indis.except(firstIndi);
				expect(exceptOne).toBeInstanceOf(Individuals);
				expect(exceptOne.count()).toBe(indis.count() - 1);
			}
		});
	});

	describe("Date-based Operations", () => {
		it("should get first birth event", () => {
			const firstBirth = indis.getFirstBirth();
			if (firstBirth) {
				expect(firstBirth).toHaveProperty("DATE");
			}
		});

		it("should get last birth event", () => {
			const lastBirth = indis.getLastBirth();
			if (lastBirth) {
				expect(lastBirth).toHaveProperty("DATE");
			}
		});

		it("should get first death event", () => {
			const firstDeath = indis.getFirstDeath();
			if (firstDeath) {
				expect(firstDeath).toHaveProperty("DATE");
			}
		});

		it("should get last death event", () => {
			const lastDeath = indis.getLastDeath();
			if (lastDeath) {
				expect(lastDeath).toHaveProperty("DATE");
			}
		});

		it("should get first event (birth or death)", () => {
			const firstEvent = indis.getFirstEvent();
			if (firstEvent) {
				expect(firstEvent).toHaveProperty("DATE");
			}
		});

		it("should get last event (birth or death)", () => {
			const lastEvent = indis.getLastEvent();
			if (lastEvent) {
				expect(lastEvent).toHaveProperty("DATE");
			}
		});
	});

	describe("Ordering", () => {
		it("should order by birth ascending", () => {
			const ordered = indis.orderBy("BIRTH_ASC");
			expect(ordered).toBeInstanceOf(Individuals);
			expect(ordered.count()).toBe(indis.count());
		});

		it("should order by birth descending", () => {
			const ordered = indis.orderBy("BIRTH_DESC");
			expect(ordered).toBeInstanceOf(Individuals);
			expect(ordered.count()).toBe(indis.count());
		});

		it("should order by death ascending", () => {
			const ordered = indis.orderBy("DEATH_ASC");
			expect(ordered).toBeInstanceOf(Individuals);
			expect(ordered.count()).toBe(indis.count());
		});

		it("should order by death descending", () => {
			const ordered = indis.orderBy("DEATH_DESC");
			expect(ordered).toBeInstanceOf(Individuals);
			expect(ordered.count()).toBe(indis.count());
		});

		it("should order with custom function", () => {
			const ordered = indis.orderBy((a, b) => {
				const nameA = a.get("NAME")?.toValue() || "";
				const nameB = b.get("NAME")?.toValue() || "";
				return nameA.localeCompare(nameB);
			});
			expect(ordered).toBeInstanceOf(Individuals);
			expect(ordered.count()).toBe(indis.count());
		});
	});

	describe("Grouping Operations", () => {
		it("should group by first letters", () => {
			const grouped = indis.groupByFirstLetters();
			expect(grouped).toBeDefined();
			expect(typeof grouped).toBe("object");
			// Should have at least one group
			expect(Object.keys(grouped).length).toBeGreaterThan(0);
		});

		it("should group by surnames", () => {
			const grouped = indis.groupBySurnames();
			expect(grouped).toBeDefined();
			expect(typeof grouped).toBe("object");
			// Should have at least one surname group
			expect(Object.keys(grouped).length).toBeGreaterThan(0);
		});

		it("should group by time ranges", () => {
			const grouped = indis.groupByTimeRanges(50); // 50 year ranges
			expect(grouped).toBeDefined();
			expect(typeof grouped).toBe("object");
		});

		it("should group with custom function", () => {
			const grouped = indis.groupBy((indi) => {
				const sex = indi.get("SEX")?.toValue();
				return sex === "M" ? "Males" : sex === "F" ? "Females" : "Unknown";
			});
			expect(grouped).toBeDefined();
			expect(typeof grouped).toBe("object");
			// Should have at least Males or Females group
			expect(
				grouped.Males !== undefined || grouped.Females !== undefined
			).toBe(true);
		});
	});

	describe("Unattached Filter", () => {
		it("should filter unattached members when useUnattached is false", () => {
			const attached = indis.unattachedFilter(false);
			expect(attached).toBeInstanceOf(Individuals);
			// Attached count should be <= total count
			expect(attached.count()).toBeLessThanOrEqual(indis.count());
		});

		it("should not filter when useUnattached is true", () => {
			const all = indis.unattachedFilter(true);
			expect(all).toBeInstanceOf(Individuals);
			expect(all.count()).toBe(indis.count());
		});
	});

	describe("List Operations", () => {
		it("should get first individual", () => {
			const first = indis.first();
			expect(first).toBeDefined();
		});

		it("should get last individual", () => {
			const last = indis.last();
			expect(last).toBeDefined();
		});

		it("should iterate with each", () => {
			let count = 0;
			indis.each(() => {
				count++;
			});
			expect(count).toBe(indis.count());
		});

		it("should map individuals", () => {
			const names = indis.map((indi) => indi.get("NAME")?.toValue() || "");
			expect(names.length).toBe(indis.count());
		});

		it("should reduce individuals", () => {
			const maleCount = indis.reduce((acc, indi) => {
				return indi.get("SEX")?.toValue() === "M" ? acc + 1 : acc;
			}, 0);
			expect(typeof maleCount).toBe("number");
			expect(maleCount).toBeGreaterThanOrEqual(0);
		});
	});
});
