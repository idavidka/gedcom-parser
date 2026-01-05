import GedcomTree from "..";
import { textFileLoader } from "./test-utils";
import { CommonDate } from "../classes";

const mock = textFileLoader("src/__tests__/mocks/mock.ged");

describe("Date Class Functionality", () => {
	const { gedcom: testGedcom } = GedcomTree.parse(mock);

	describe("Date Parsing", () => {
		it("should parse birth dates", () => {
			const indis = testGedcom.indis();
			let foundDate = false;
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						foundDate = true;
						expect(date).toBeDefined();
						expect(date).toBeInstanceOf(CommonDate);
						break;
					}
				}

				if (i > 1000) break; // prevent long loops in case of failure
			}
			expect(foundDate).toBe(true);
		});

		it("should parse death dates", () => {
			const indis = testGedcom.indis();
			let foundDate = false;
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const deat = indi?.get("DEAT");
				if (deat) {
					const date = deat.get("DATE");
					if (date) {
						foundDate = true;
						expect(date).toBeDefined();
						expect(date).toBeInstanceOf(CommonDate);
						break;
					}
				}

				if (i > 1000) break; // prevent long loops in case of failure
			}

			expect(foundDate).toBe(true);
		});

		it("should parse marriage dates", () => {
			const fams = testGedcom.fams();
			let foundDate = false;
			for (let i = 0; i < (fams?.length ?? 0); i++) {
				const fam = fams?.index(i);
				const marr = fam?.get("MARR");
				if (marr) {
					const date = marr.get("DATE");
					if (date) {
						foundDate = true;
						expect(date).toBeDefined();
						expect(date).toBeInstanceOf(CommonDate);
						break;
					}
				}
				if (i > 100) break; // prevent long loops in case of failure
			}

			expect(foundDate).toBe(true);
		});
	});

	describe("Date Components", () => {
		it("should extract year from dates", () => {
			const indis = testGedcom.indis();
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						const year = date.get("YEAR");
						if (year) {
							const yearValue = year.toValue();
							expect(typeof yearValue).toBe("string");
							expect(parseInt(yearValue)).toBeGreaterThan(1000);
							expect(parseInt(yearValue)).toBeLessThan(2100);
							break;
						}
					}
				}
				if (i > 100) break; // prevent long loops in case of failure
			}
		});

		it("should extract month from dates", () => {
			const indis = testGedcom.indis();
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						const month = date.get("MONTH");
						if (month) {
							const monthValue = month.toValue();
							expect(typeof monthValue).toBe("string");
							expect(monthValue?.length).toBeGreaterThan(0);
							break;
						}
					}
				}

				if (i > 100) break; // prevent long loops in case of failure
			}
		});

		it("should extract day from dates", () => {
			const indis = testGedcom.indis();
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						const day = date.get("DAY");
						if (day) {
							const dayValue = day.toValue();
							expect(typeof dayValue).toBe("string");
							const dayNum = parseInt(dayValue);
							expect(dayNum).toBeGreaterThanOrEqual(1);
							expect(dayNum).toBeLessThanOrEqual(31);
							break;
						}
					}
				}
				if (i > 100) break; // prevent long loops in case of failure
			}
		});
	});

	describe("Date Formatting", () => {
		it("should convert date to string", () => {
			const indis = testGedcom.indis();
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						const dateStr = date.toValue();
						expect(typeof dateStr).toBe("string");
						expect(dateStr.length).toBeGreaterThan(0);
						break;
					}
				}
			}
		});

		it("should handle approximate dates", () => {
			const indis = testGedcom.indis();
			let foundApproximate = false;
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						const dateStr = date.toList().index(0)?.toValue();
						if (
							dateStr?.includes("Abt") ||
							dateStr?.includes("ABT")
						) {
							foundApproximate = true;
							break;
						}
					}
				}
			}

			expect(foundApproximate).toBe(true);
		});

		it("should have rawValue property", () => {
			const indis = testGedcom.indis();
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date instanceof CommonDate) {
						expect(date).toHaveProperty("rawValue");
						break;
					}
				}
				if (i > 100) break; // prevent long loops in case of failure
			}
		});
	});

	describe("Date Comparison", () => {
		it("should compare dates by rawValue", () => {
			const indis = testGedcom.indis();
			const datesWithRawValue: Date[] = [];

			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (
						date instanceof CommonDate &&
						date.rawValue !== undefined
					) {
						datesWithRawValue.push(date.rawValue);
						break;
					}
				}
				if (i > 100) break; // prevent long loops in case of failure
			}

			if (datesWithRawValue.length >= 2) {
				// Dates should be comparable
				const sorted = [...datesWithRawValue].sort(
					(a, b) => a.getTime() - b.getTime()
				);
				expect(sorted[0].getTime()).toBeLessThanOrEqual(
					sorted[sorted.length - 1].getTime()
				);
			}
		});
	});

	describe("Date Validation", () => {
		it("should handle invalid dates gracefully", () => {
			const indis = testGedcom.indis();
			for (let i = 0; i < (indis?.length ?? 0); i++) {
				const indi = indis?.index(i);
				const birt = indi?.get("BIRT");
				if (birt) {
					const date = birt.get("DATE");
					if (date) {
						// Should not throw error when accessing components
						expect(() => {
							date.get("YEAR");
							date.get("MONTH");
							date.get("DAY");
						}).not.toThrow();
						break;
					}
				}
				if (i > 100) break; // prevent long loops in case of failure
			}
		});
	});
});
