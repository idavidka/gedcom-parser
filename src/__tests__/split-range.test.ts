import { splitRange } from "../utils/range";

describe("Range Splitting Utility", () => {
	describe("Range Manipulation", () => {
		describe("Split Range Function", () => {
			it("should split - by -", () => {
				expect(splitRange("-", "-")).toEqual([
					{ range: "-", to: true, by: true },
				]);
			});
			it("should split - by -1980", () => {
				expect(splitRange("-", "-1980")).toEqual([
					{ range: "-1980", to: true, by: true },
					{ range: "1981-", to: true },
				]);
			});
			it("should split - by 1990-", () => {
				expect(splitRange("-", "1990-")).toEqual([
					{ range: "-1989", to: true },
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split - by 1980-", () => {
				expect(splitRange("-", "1980-")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-", to: true, by: true },
				]);
			});
			it("should split - by -1990", () => {
				expect(splitRange("-", "-1990")).toEqual([
					{ range: "-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split - by -1970", () => {
				expect(splitRange("-", "-1970")).toEqual([
					{ range: "-1970", to: true, by: true },
					{ range: "1971-", to: true },
				]);
			});
			it("should split - by 2000-", () => {
				expect(splitRange("-", "2000-")).toEqual([
					{ range: "-1999", to: true },
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split - by 1970-", () => {
				expect(splitRange("-", "1970-")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-", to: true, by: true },
				]);
			});
			it("should split - by -2000", () => {
				expect(splitRange("-", "-2000")).toEqual([
					{ range: "-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split - by 1980-1990", () => {
				expect(splitRange("-", "1980-1990")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split - by 1970-2000", () => {
				expect(splitRange("-", "1970-2000")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split - by 1970-1985", () => {
				expect(splitRange("-", "1970-1985")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1985", to: true, by: true },
					{ range: "1986-", to: true },
				]);
			});
			it("should split - by 1985-2000", () => {
				expect(splitRange("-", "1985-2000")).toEqual([
					{ range: "-1984", to: true },
					{ range: "1985-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split -1980 by -", () => {
				expect(splitRange("-1980", "-")).toEqual([
					{ range: "-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by -1980", () => {
				expect(splitRange("-1980", "-1980")).toEqual([
					{ range: "-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by 1990-", () => {
				expect(splitRange("-1980", "1990-")).toEqual([
					{ range: "-1980", to: true },
				]);
			});
			it("should split -1980 by 1980-", () => {
				expect(splitRange("-1980", "1980-")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by -1990", () => {
				expect(splitRange("-1980", "-1990")).toEqual([
					{ range: "-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by -1970", () => {
				expect(splitRange("-1980", "-1970")).toEqual([
					{ range: "-1970", to: true, by: true },
					{ range: "1971-1980", to: true },
				]);
			});
			it("should split -1980 by 2000-", () => {
				expect(splitRange("-1980", "2000-")).toEqual([
					{ range: "-1980", to: true },
				]);
			});
			it("should split -1980 by 1970-", () => {
				expect(splitRange("-1980", "1970-")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by -2000", () => {
				expect(splitRange("-1980", "-2000")).toEqual([
					{ range: "-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by 1980-1990", () => {
				expect(splitRange("-1980", "1980-1990")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by 1970-2000", () => {
				expect(splitRange("-1980", "1970-2000")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by 1970-1985", () => {
				expect(splitRange("-1980", "1970-1985")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1980", to: true, by: true },
				]);
			});
			it("should split -1980 by 1985-2000", () => {
				expect(splitRange("-1980", "1985-2000")).toEqual([
					{ range: "-1980", to: true },
				]);
			});
			it("should split 1990- by -", () => {
				expect(splitRange("1990-", "-")).toEqual([
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split 1990- by -1980", () => {
				expect(splitRange("1990-", "-1980")).toEqual([
					{ range: "1990-", to: true },
				]);
			});
			it("should split 1990- by 1990-", () => {
				expect(splitRange("1990-", "1990-")).toEqual([
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split 1990- by 1980-", () => {
				expect(splitRange("1990-", "1980-")).toEqual([
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split 1990- by -1990", () => {
				expect(splitRange("1990-", "-1990")).toEqual([
					{ range: "1990-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split 1990- by -1970", () => {
				expect(splitRange("1990-", "-1970")).toEqual([
					{ range: "1990-", to: true },
				]);
			});
			it("should split 1990- by 2000-", () => {
				expect(splitRange("1990-", "2000-")).toEqual([
					{ range: "1990-1999", to: true },
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 1990- by 1970-", () => {
				expect(splitRange("1990-", "1970-")).toEqual([
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split 1990- by -2000", () => {
				expect(splitRange("1990-", "-2000")).toEqual([
					{ range: "1990-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1990- by 1980-1990", () => {
				expect(splitRange("1990-", "1980-1990")).toEqual([
					{ range: "1990-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split 1990- by 1970-2000", () => {
				expect(splitRange("1990-", "1970-2000")).toEqual([
					{ range: "1990-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1990- by 1970-1985", () => {
				expect(splitRange("1990-", "1970-1985")).toEqual([
					{ range: "1990-", to: true },
				]);
			});
			it("should split 1990- by 1985-2000", () => {
				expect(splitRange("1990-", "1985-2000")).toEqual([
					{ range: "1990-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1980- by -", () => {
				expect(splitRange("1980-", "-")).toEqual([
					{ range: "1980-", to: true, by: true },
				]);
			});
			it("should split 1980- by -1980", () => {
				expect(splitRange("1980-", "-1980")).toEqual([
					{ range: "1980-1980", to: true, by: true },
					{ range: "1981-", to: true },
				]);
			});
			it("should split 1980- by 1990-", () => {
				expect(splitRange("1980-", "1990-")).toEqual([
					{ range: "1980-1989", to: true },
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split 1980- by 1980-", () => {
				expect(splitRange("1980-", "1980-")).toEqual([
					{ range: "1980-", to: true, by: true },
				]);
			});
			it("should split 1980- by -1990", () => {
				expect(splitRange("1980-", "-1990")).toEqual([
					{ range: "1980-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split 1980- by -1970", () => {
				expect(splitRange("1980-", "-1970")).toEqual([
					{ range: "1980-", to: true },
				]);
			});
			it("should split 1980- by 2000-", () => {
				expect(splitRange("1980-", "2000-")).toEqual([
					{ range: "1980-1999", to: true },
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 1980- by 1970-", () => {
				expect(splitRange("1980-", "1970-")).toEqual([
					{ range: "1980-", to: true, by: true },
				]);
			});
			it("should split 1980- by -2000", () => {
				expect(splitRange("1980-", "-2000")).toEqual([
					{ range: "1980-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1980- by 1980-1990", () => {
				expect(splitRange("1980-", "1980-1990")).toEqual([
					{ range: "1980-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split 1980- by 1970-2000", () => {
				expect(splitRange("1980-", "1970-2000")).toEqual([
					{ range: "1980-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1980- by 1970-1985", () => {
				expect(splitRange("1980-", "1970-1985")).toEqual([
					{ range: "1980-1985", to: true, by: true },
					{ range: "1986-", to: true },
				]);
			});
			it("should split 1980- by 1985-2000", () => {
				expect(splitRange("1980-", "1985-2000")).toEqual([
					{ range: "1980-1984", to: true },
					{ range: "1985-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split -1990 by -", () => {
				expect(splitRange("-1990", "-")).toEqual([
					{ range: "-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by -1980", () => {
				expect(splitRange("-1990", "-1980")).toEqual([
					{ range: "-1980", to: true, by: true },
					{ range: "1981-1990", to: true },
				]);
			});
			it("should split -1990 by 1990-", () => {
				expect(splitRange("-1990", "1990-")).toEqual([
					{ range: "-1989", to: true },
					{ range: "1990-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by 1980-", () => {
				expect(splitRange("-1990", "1980-")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by -1990", () => {
				expect(splitRange("-1990", "-1990")).toEqual([
					{ range: "-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by -1970", () => {
				expect(splitRange("-1990", "-1970")).toEqual([
					{ range: "-1970", to: true, by: true },
					{ range: "1971-1990", to: true },
				]);
			});
			it("should split -1990 by 2000-", () => {
				expect(splitRange("-1990", "2000-")).toEqual([
					{ range: "-1990", to: true },
				]);
			});
			it("should split -1990 by 1970-", () => {
				expect(splitRange("-1990", "1970-")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by -2000", () => {
				expect(splitRange("-1990", "-2000")).toEqual([
					{ range: "-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by 1980-1990", () => {
				expect(splitRange("-1990", "1980-1990")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by 1970-2000", () => {
				expect(splitRange("-1990", "1970-2000")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1990", to: true, by: true },
				]);
			});
			it("should split -1990 by 1970-1985", () => {
				expect(splitRange("-1990", "1970-1985")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1985", to: true, by: true },
					{ range: "1986-1990", to: true },
				]);
			});
			it("should split -1990 by 1985-2000", () => {
				expect(splitRange("-1990", "1985-2000")).toEqual([
					{ range: "-1984", to: true },
					{ range: "1985-1990", to: true, by: true },
				]);
			});
			it("should split -1970 by -", () => {
				expect(splitRange("-1970", "-")).toEqual([
					{ range: "-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by -1980", () => {
				expect(splitRange("-1970", "-1980")).toEqual([
					{ range: "-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by 1990-", () => {
				expect(splitRange("-1970", "1990-")).toEqual([
					{ range: "-1970", to: true },
				]);
			});
			it("should split -1970 by 1980-", () => {
				expect(splitRange("-1970", "1980-")).toEqual([
					{ range: "-1970", to: true },
				]);
			});
			it("should split -1970 by -1990", () => {
				expect(splitRange("-1970", "-1990")).toEqual([
					{ range: "-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by -1970", () => {
				expect(splitRange("-1970", "-1970")).toEqual([
					{ range: "-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by 2000-", () => {
				expect(splitRange("-1970", "2000-")).toEqual([
					{ range: "-1970", to: true },
				]);
			});
			it("should split -1970 by 1970-", () => {
				expect(splitRange("-1970", "1970-")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by -2000", () => {
				expect(splitRange("-1970", "-2000")).toEqual([
					{ range: "-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by 1980-1990", () => {
				expect(splitRange("-1970", "1980-1990")).toEqual([
					{ range: "-1970", to: true },
				]);
			});
			it("should split -1970 by 1970-2000", () => {
				expect(splitRange("-1970", "1970-2000")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by 1970-1985", () => {
				expect(splitRange("-1970", "1970-1985")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1970", to: true, by: true },
				]);
			});
			it("should split -1970 by 1985-2000", () => {
				expect(splitRange("-1970", "1985-2000")).toEqual([
					{ range: "-1970", to: true },
				]);
			});
			it("should split 2000- by -", () => {
				expect(splitRange("2000-", "-")).toEqual([
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 2000- by -1980", () => {
				expect(splitRange("2000-", "-1980")).toEqual([
					{ range: "2000-", to: true },
				]);
			});
			it("should split 2000- by 1990-", () => {
				expect(splitRange("2000-", "1990-")).toEqual([
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 2000- by 1980-", () => {
				expect(splitRange("2000-", "1980-")).toEqual([
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 2000- by -1990", () => {
				expect(splitRange("2000-", "-1990")).toEqual([
					{ range: "2000-", to: true },
				]);
			});
			it("should split 2000- by -1970", () => {
				expect(splitRange("2000-", "-1970")).toEqual([
					{ range: "2000-", to: true },
				]);
			});
			it("should split 2000- by 2000-", () => {
				expect(splitRange("2000-", "2000-")).toEqual([
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 2000- by 1970-", () => {
				expect(splitRange("2000-", "1970-")).toEqual([
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 2000- by -2000", () => {
				expect(splitRange("2000-", "-2000")).toEqual([
					{ range: "2000-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 2000- by 1980-1990", () => {
				expect(splitRange("2000-", "1980-1990")).toEqual([
					{ range: "2000-", to: true },
				]);
			});
			it("should split 2000- by 1970-2000", () => {
				expect(splitRange("2000-", "1970-2000")).toEqual([
					{ range: "2000-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 2000- by 1970-1985", () => {
				expect(splitRange("2000-", "1970-1985")).toEqual([
					{ range: "2000-", to: true },
				]);
			});
			it("should split 2000- by 1985-2000", () => {
				expect(splitRange("2000-", "1985-2000")).toEqual([
					{ range: "2000-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1970- by -", () => {
				expect(splitRange("1970-", "-")).toEqual([
					{ range: "1970-", to: true, by: true },
				]);
			});
			it("should split 1970- by -1980", () => {
				expect(splitRange("1970-", "-1980")).toEqual([
					{ range: "1970-1980", to: true, by: true },
					{ range: "1981-", to: true },
				]);
			});
			it("should split 1970- by 1990-", () => {
				expect(splitRange("1970-", "1990-")).toEqual([
					{ range: "1970-1989", to: true },
					{ range: "1990-", to: true, by: true },
				]);
			});
			it("should split 1970- by 1980-", () => {
				expect(splitRange("1970-", "1980-")).toEqual([
					{ range: "1970-1979", to: true },
					{ range: "1980-", to: true, by: true },
				]);
			});
			it("should split 1970- by -1990", () => {
				expect(splitRange("1970-", "-1990")).toEqual([
					{ range: "1970-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split 1970- by -1970", () => {
				expect(splitRange("1970-", "-1970")).toEqual([
					{ range: "1970-1970", to: true, by: true },
					{ range: "1971-", to: true },
				]);
			});
			it("should split 1970- by 2000-", () => {
				expect(splitRange("1970-", "2000-")).toEqual([
					{ range: "1970-1999", to: true },
					{ range: "2000-", to: true, by: true },
				]);
			});
			it("should split 1970- by 1970-", () => {
				expect(splitRange("1970-", "1970-")).toEqual([
					{ range: "1970-", to: true, by: true },
				]);
			});
			it("should split 1970- by -2000", () => {
				expect(splitRange("1970-", "-2000")).toEqual([
					{ range: "1970-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1970- by 1980-1990", () => {
				expect(splitRange("1970-", "1980-1990")).toEqual([
					{ range: "1970-1979", to: true },
					{ range: "1980-1990", to: true, by: true },
					{ range: "1991-", to: true },
				]);
			});
			it("should split 1970- by 1970-2000", () => {
				expect(splitRange("1970-", "1970-2000")).toEqual([
					{ range: "1970-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split 1970- by 1970-1985", () => {
				expect(splitRange("1970-", "1970-1985")).toEqual([
					{ range: "1970-1985", to: true, by: true },
					{ range: "1986-", to: true },
				]);
			});
			it("should split 1970- by 1985-2000", () => {
				expect(splitRange("1970-", "1985-2000")).toEqual([
					{ range: "1970-1984", to: true },
					{ range: "1985-2000", to: true, by: true },
					{ range: "2001-", to: true },
				]);
			});
			it("should split -2000 by -", () => {
				expect(splitRange("-2000", "-")).toEqual([
					{ range: "-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by -1980", () => {
				expect(splitRange("-2000", "-1980")).toEqual([
					{ range: "-1980", to: true, by: true },
					{ range: "1981-2000", to: true },
				]);
			});
			it("should split -2000 by 1990-", () => {
				expect(splitRange("-2000", "1990-")).toEqual([
					{ range: "-1989", to: true },
					{ range: "1990-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by 1980-", () => {
				expect(splitRange("-2000", "1980-")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by -1990", () => {
				expect(splitRange("-2000", "-1990")).toEqual([
					{ range: "-1990", to: true, by: true },
					{ range: "1991-2000", to: true },
				]);
			});
			it("should split -2000 by -1970", () => {
				expect(splitRange("-2000", "-1970")).toEqual([
					{ range: "-1970", to: true, by: true },
					{ range: "1971-2000", to: true },
				]);
			});
			it("should split -2000 by 2000-", () => {
				expect(splitRange("-2000", "2000-")).toEqual([
					{ range: "-1999", to: true },
					{ range: "2000-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by 1970-", () => {
				expect(splitRange("-2000", "1970-")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by -2000", () => {
				expect(splitRange("-2000", "-2000")).toEqual([
					{ range: "-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by 1980-1990", () => {
				expect(splitRange("-2000", "1980-1990")).toEqual([
					{ range: "-1979", to: true },
					{ range: "1980-1990", to: true, by: true },
					{ range: "1991-2000", to: true },
				]);
			});
			it("should split -2000 by 1970-2000", () => {
				expect(splitRange("-2000", "1970-2000")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-2000", to: true, by: true },
				]);
			});
			it("should split -2000 by 1970-1985", () => {
				expect(splitRange("-2000", "1970-1985")).toEqual([
					{ range: "-1969", to: true },
					{ range: "1970-1985", to: true, by: true },
					{ range: "1986-2000", to: true },
				]);
			});
			it("should split -2000 by 1985-2000", () => {
				expect(splitRange("-2000", "1985-2000")).toEqual([
					{ range: "-1984", to: true },
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by -", () => {
				expect(splitRange("1980-1990", "-")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by -1980", () => {
				expect(splitRange("1980-1990", "-1980")).toEqual([
					{ range: "1980-1980", to: true, by: true },
					{ range: "1981-1990", to: true },
				]);
			});
			it("should split 1980-1990 by 1990-", () => {
				expect(splitRange("1980-1990", "1990-")).toEqual([
					{ range: "1980-1989", to: true },
					{ range: "1990-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by 1980-", () => {
				expect(splitRange("1980-1990", "1980-")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by -1990", () => {
				expect(splitRange("1980-1990", "-1990")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by -1970", () => {
				expect(splitRange("1980-1990", "-1970")).toEqual([
					{ range: "1980-1990", to: true },
				]);
			});
			it("should split 1980-1990 by 2000-", () => {
				expect(splitRange("1980-1990", "2000-")).toEqual([
					{ range: "1980-1990", to: true },
				]);
			});
			it("should split 1980-1990 by 1970-", () => {
				expect(splitRange("1980-1990", "1970-")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by -2000", () => {
				expect(splitRange("1980-1990", "-2000")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by 1980-1990", () => {
				expect(splitRange("1980-1990", "1980-1990")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by 1970-2000", () => {
				expect(splitRange("1980-1990", "1970-2000")).toEqual([
					{ range: "1980-1990", to: true, by: true },
				]);
			});
			it("should split 1980-1990 by 1970-1985", () => {
				expect(splitRange("1980-1990", "1970-1985")).toEqual([
					{ range: "1980-1985", to: true, by: true },
					{ range: "1986-1990", to: true },
				]);
			});
			it("should split 1980-1990 by 1985-2000", () => {
				expect(splitRange("1980-1990", "1985-2000")).toEqual([
					{ range: "1980-1984", to: true },
					{ range: "1985-1990", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by -", () => {
				expect(splitRange("1970-2000", "-")).toEqual([
					{ range: "1970-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by -1980", () => {
				expect(splitRange("1970-2000", "-1980")).toEqual([
					{ range: "1970-1980", to: true, by: true },
					{ range: "1981-2000", to: true },
				]);
			});
			it("should split 1970-2000 by 1990-", () => {
				expect(splitRange("1970-2000", "1990-")).toEqual([
					{ range: "1970-1989", to: true },
					{ range: "1990-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by 1980-", () => {
				expect(splitRange("1970-2000", "1980-")).toEqual([
					{ range: "1970-1979", to: true },
					{ range: "1980-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by -1990", () => {
				expect(splitRange("1970-2000", "-1990")).toEqual([
					{ range: "1970-1990", to: true, by: true },
					{ range: "1991-2000", to: true },
				]);
			});
			it("should split 1970-2000 by -1970", () => {
				expect(splitRange("1970-2000", "-1970")).toEqual([
					{ range: "1970-1970", to: true, by: true },
					{ range: "1971-2000", to: true },
				]);
			});
			it("should split 1970-2000 by 2000-", () => {
				expect(splitRange("1970-2000", "2000-")).toEqual([
					{ range: "1970-1999", to: true },
					{ range: "2000-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by 1970-", () => {
				expect(splitRange("1970-2000", "1970-")).toEqual([
					{ range: "1970-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by -2000", () => {
				expect(splitRange("1970-2000", "-2000")).toEqual([
					{ range: "1970-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by 1980-1990", () => {
				expect(splitRange("1970-2000", "1980-1990")).toEqual([
					{ range: "1970-1979", to: true },
					{ range: "1980-1990", to: true, by: true },
					{ range: "1991-2000", to: true },
				]);
			});
			it("should split 1970-2000 by 1970-2000", () => {
				expect(splitRange("1970-2000", "1970-2000")).toEqual([
					{ range: "1970-2000", to: true, by: true },
				]);
			});
			it("should split 1970-2000 by 1970-1985", () => {
				expect(splitRange("1970-2000", "1970-1985")).toEqual([
					{ range: "1970-1985", to: true, by: true },
					{ range: "1986-2000", to: true },
				]);
			});
			it("should split 1970-2000 by 1985-2000", () => {
				expect(splitRange("1970-2000", "1985-2000")).toEqual([
					{ range: "1970-1984", to: true },
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by -", () => {
				expect(splitRange("1970-1985", "-")).toEqual([
					{ range: "1970-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by -1980", () => {
				expect(splitRange("1970-1985", "-1980")).toEqual([
					{ range: "1970-1980", to: true, by: true },
					{ range: "1981-1985", to: true },
				]);
			});
			it("should split 1970-1985 by 1990-", () => {
				expect(splitRange("1970-1985", "1990-")).toEqual([
					{ range: "1970-1985", to: true },
				]);
			});
			it("should split 1970-1985 by 1980-", () => {
				expect(splitRange("1970-1985", "1980-")).toEqual([
					{ range: "1970-1979", to: true },
					{ range: "1980-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by -1990", () => {
				expect(splitRange("1970-1985", "-1990")).toEqual([
					{ range: "1970-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by -1970", () => {
				expect(splitRange("1970-1985", "-1970")).toEqual([
					{ range: "1970-1970", to: true, by: true },
					{ range: "1971-1985", to: true },
				]);
			});
			it("should split 1970-1985 by 2000-", () => {
				expect(splitRange("1970-1985", "2000-")).toEqual([
					{ range: "1970-1985", to: true },
				]);
			});
			it("should split 1970-1985 by 1970-", () => {
				expect(splitRange("1970-1985", "1970-")).toEqual([
					{ range: "1970-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by -2000", () => {
				expect(splitRange("1970-1985", "-2000")).toEqual([
					{ range: "1970-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by 1980-1990", () => {
				expect(splitRange("1970-1985", "1980-1990")).toEqual([
					{ range: "1970-1979", to: true },
					{ range: "1980-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by 1970-2000", () => {
				expect(splitRange("1970-1985", "1970-2000")).toEqual([
					{ range: "1970-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by 1970-1985", () => {
				expect(splitRange("1970-1985", "1970-1985")).toEqual([
					{ range: "1970-1985", to: true, by: true },
				]);
			});
			it("should split 1970-1985 by 1985-2000", () => {
				expect(splitRange("1970-1985", "1985-2000")).toEqual([
					{ range: "1970-1984", to: true },
					{ range: "1985-1985", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by -", () => {
				expect(splitRange("1985-2000", "-")).toEqual([
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by -1980", () => {
				expect(splitRange("1985-2000", "-1980")).toEqual([
					{ range: "1985-2000", to: true },
				]);
			});
			it("should split 1985-2000 by 1990-", () => {
				expect(splitRange("1985-2000", "1990-")).toEqual([
					{ range: "1985-1989", to: true },
					{ range: "1990-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by 1980-", () => {
				expect(splitRange("1985-2000", "1980-")).toEqual([
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by -1990", () => {
				expect(splitRange("1985-2000", "-1990")).toEqual([
					{ range: "1985-1990", to: true, by: true },
					{ range: "1991-2000", to: true },
				]);
			});
			it("should split 1985-2000 by -1970", () => {
				expect(splitRange("1985-2000", "-1970")).toEqual([
					{ range: "1985-2000", to: true },
				]);
			});
			it("should split 1985-2000 by 2000-", () => {
				expect(splitRange("1985-2000", "2000-")).toEqual([
					{ range: "1985-1999", to: true },
					{ range: "2000-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by 1970-", () => {
				expect(splitRange("1985-2000", "1970-")).toEqual([
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by -2000", () => {
				expect(splitRange("1985-2000", "-2000")).toEqual([
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by 1980-1990", () => {
				expect(splitRange("1985-2000", "1980-1990")).toEqual([
					{ range: "1985-1990", to: true, by: true },
					{ range: "1991-2000", to: true },
				]);
			});
			it("should split 1985-2000 by 1970-2000", () => {
				expect(splitRange("1985-2000", "1970-2000")).toEqual([
					{ range: "1985-2000", to: true, by: true },
				]);
			});
			it("should split 1985-2000 by 1970-1985", () => {
				expect(splitRange("1985-2000", "1970-1985")).toEqual([
					{ range: "1985-1985", to: true, by: true },
					{ range: "1986-2000", to: true },
				]);
			});
			it("should split 1985-2000 by 1985-2000", () => {
				expect(splitRange("1985-2000", "1985-2000")).toEqual([
					{ range: "1985-2000", to: true, by: true },
				]);
			});
		});
	});
});
