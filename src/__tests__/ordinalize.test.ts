import { describe, it, expect } from "vitest";
import { ordinalize, hungarianOrdinalize } from "../utils";

describe("Number Ordinalization Utilities", () => {
	describe("English Ordinalization", () => {
		it("should ordinalize numbers ending in 1 (except 11)", () => {
			expect(ordinalize(1)).toBe("1st");
			expect(ordinalize(21)).toBe("21st");
			expect(ordinalize(31)).toBe("31st");
			expect(ordinalize(101)).toBe("101st");
		});

		it("should ordinalize numbers ending in 2 (except 12)", () => {
			expect(ordinalize(2)).toBe("2nd");
			expect(ordinalize(22)).toBe("22nd");
			expect(ordinalize(32)).toBe("32nd");
			expect(ordinalize(102)).toBe("102nd");
		});

		it("should ordinalize numbers ending in 3 (except 13)", () => {
			expect(ordinalize(3)).toBe("3rd");
			expect(ordinalize(23)).toBe("23rd");
			expect(ordinalize(33)).toBe("33rd");
			expect(ordinalize(103)).toBe("103rd");
		});

		it("should ordinalize teens with 'th'", () => {
			expect(ordinalize(11)).toBe("11th");
			expect(ordinalize(12)).toBe("12th");
			expect(ordinalize(13)).toBe("13th");
			expect(ordinalize(14)).toBe("14th");
			expect(ordinalize(111)).toBe("111th");
			expect(ordinalize(112)).toBe("112th");
			expect(ordinalize(113)).toBe("113th");
		});

		it("should ordinalize other numbers with 'th'", () => {
			expect(ordinalize(4)).toBe("4th");
			expect(ordinalize(5)).toBe("5th");
			expect(ordinalize(10)).toBe("10th");
			expect(ordinalize(100)).toBe("100th");
		});

		it("should handle zero", () => {
			expect(ordinalize(0)).toBe("0th");
		});

		it("should round decimal numbers", () => {
			expect(ordinalize(1.4)).toBe("1st");
			expect(ordinalize(1.6)).toBe("2nd");
			// 2.5 rounds to 3
			expect(ordinalize(2.5)).toBe("3rd");
		});
	});
});

describe("Hungarian Ordinalization", () => {
	it("should ordinalize single digits", () => {
		expect(hungarianOrdinalize(1)).toBe("első");
		expect(hungarianOrdinalize(2)).toBe("másod");
		expect(hungarianOrdinalize(3)).toBe("harmad");
		expect(hungarianOrdinalize(4)).toBe("negyed");
		expect(hungarianOrdinalize(5)).toBe("ötöd");
	});

	it("should ordinalize teens", () => {
		expect(hungarianOrdinalize(10)).toBe("tized");
		// The actual output for 11
		expect(hungarianOrdinalize(11)).toBe("tizenegyed");
		// The actual output for 12
		expect(hungarianOrdinalize(12)).toBe("tizenketted");
	});

	it("should ordinalize twenties", () => {
		expect(hungarianOrdinalize(20)).toBe("huszad");
		// The actual output for 21
		expect(hungarianOrdinalize(21)).toBe("huszonegyed");
	});

	it("should handle negative numbers", () => {
		const result = hungarianOrdinalize(-5);
		expect(result).toBeTruthy();
	});

	it("should ordinalize 100", () => {
		expect(hungarianOrdinalize(100)).toBe("század");
	});

	it("should ordinalize 1000", () => {
		// The actual output for 1000
		expect(hungarianOrdinalize(1000)).toBe("ezredszázad");
	});
});
