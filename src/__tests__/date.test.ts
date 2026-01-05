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
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date) {
            foundDate = true;
            expect(date).toBeDefined();
            expect(date).toBeInstanceOf(CommonDate);
          }
        }
      });
      expect(foundDate).toBe(true);
    });

    it("should parse death dates", () => {
      const indis = testGedcom.indis();
      let foundDate = false;
      indis.forEach((indi) => {
        const deat = indi.get("DEAT");
        if (deat) {
          const date = deat.get("DATE");
          if (date) {
            foundDate = true;
            expect(date).toBeDefined();
            expect(date).toBeInstanceOf(CommonDate);
          }
        }
      });
      // Some individuals should have death dates
      if (indis.count() > 100) {
        expect(foundDate).toBe(true);
      }
    });

    it("should parse marriage dates", () => {
      const fams = testGedcom.fams();
      let foundDate = false;
      fams.forEach((fam) => {
        const marr = fam.get("MARR");
        if (marr) {
          const date = marr.get("DATE");
          if (date) {
            foundDate = true;
            expect(date).toBeDefined();
            expect(date).toBeInstanceOf(CommonDate);
          }
        }
      });
      // Some families should have marriage dates
      if (fams.count() > 50) {
        expect(foundDate).toBe(true);
      }
    });
  });

  describe("Date Components", () => {
    it("should extract year from dates", () => {
      const indis = testGedcom.indis();
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date) {
            const year = date.get("YEAR");
            if (year) {
              const yearValue = year.toValue();
              expect(typeof yearValue).toBe("string");
              expect(parseInt(yearValue)).toBeGreaterThan(1000);
              expect(parseInt(yearValue)).toBeLessThan(2100);
            }
          }
        }
      });
    });

    it("should extract month from dates", () => {
      const indis = testGedcom.indis();
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date) {
            const month = date.get("MONTH");
            if (month) {
              const monthValue = month.toValue();
              expect(typeof monthValue).toBe("string");
              expect(monthValue.length).toBeGreaterThan(0);
            }
          }
        }
      });
    });

    it("should extract day from dates", () => {
      const indis = testGedcom.indis();
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
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
            }
          }
        }
      });
    });
  });

  describe("Date Formatting", () => {
    it("should convert date to string", () => {
      const indis = testGedcom.indis();
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date) {
            const dateStr = date.toValue();
            expect(typeof dateStr).toBe("string");
            expect(dateStr.length).toBeGreaterThan(0);
          }
        }
      });
    });

    it("should handle approximate dates", () => {
      const indis = testGedcom.indis();
      let foundApproximate = false;
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date) {
            const dateStr = date.toValue();
            if (dateStr.includes("Abt") || dateStr.includes("ABT")) {
              foundApproximate = true;
            }
          }
        }
      });
      // Some dates should be approximate in a large dataset
      if (indis.count() > 100) {
        expect(foundApproximate).toBe(true);
      }
    });

    it("should have rawValue property", () => {
      const indis = testGedcom.indis();
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date instanceof CommonDate) {
            expect(date).toHaveProperty("rawValue");
          }
        }
      });
    });
  });

  describe("Date Comparison", () => {
    it("should compare dates by rawValue", () => {
      const indis = testGedcom.indis();
      const datesWithRawValue: Date[] = [];

      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date instanceof CommonDate && date.rawValue !== undefined) {
            datesWithRawValue.push(date.rawValue);
          }
        }
      });

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
      indis.forEach((indi) => {
        const birt = indi.get("BIRT");
        if (birt) {
          const date = birt.get("DATE");
          if (date) {
            // Should not throw error when accessing components
            expect(() => {
              date.get("YEAR");
              date.get("MONTH");
              date.get("DAY");
            }).not.toThrow();
          }
        }
      });
    });
  });
});
