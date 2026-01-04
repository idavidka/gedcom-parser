import {
	inRange,
	isIntersectedRange,
	splitRange,
	Range,
} from "../utils/range";

describe("Range Utility Functions", () => {
	describe("Range Operations", () => {
		describe("Value Within Range Check", () => {
			it("1900 should be in range 1800-2000", () => {
				expect(inRange(1900, "1800-2000")).toBe(true);
				expect(inRange(1900, [1800, 2000])).toBe(true);
			});

			it("1800 should not be in range 1900-2000", () => {
				expect(inRange(1800, "1900-2000")).toBe(false);
				expect(inRange(1800, [1900, 2000])).toBe(false);
			});

			it("2000 should not be in range 1800-1900", () => {
				expect(inRange(2000, "1800-1900")).toBe(false);
				expect(inRange(2000, [1800, 1900])).toBe(false);
			});

			it("2000 should be in range 2000-", () => {
				expect(inRange(2000, "2000-")).toBe(true);
				expect(inRange(2000, "-2000")).toBe(true);
				expect(inRange(2000, [2000])).toBe(true);
				expect(inRange(2000, [undefined, 2000])).toBe(true);
				expect(inRange(2000, [2000, Infinity])).toBe(true);
				expect(inRange(2000, [-Infinity, 2000])).toBe(true);
			});

			it("1800 should be in range -2000", () => {
				expect(inRange(1800, "-2000")).toBe(true);
				expect(inRange(1800, "2000-")).toBe(false);
				expect(inRange(1800, [2000])).toBe(false);
				expect(inRange(1800, [undefined, 2000])).toBe(true);
			});

			it("should handle invalid range correctly", () => {
				expect(inRange(2000, "invalid-range" as Range)).toBe(false);
				expect(inRange(2000, 123 as unknown as Range)).toBe(false);
				expect(inRange(2000, [] as unknown as Range)).toBe(true);
				expect(inRange(2000, undefined as unknown as Range)).toBe(
					false
				);
			});

			it("empty range should always be true", () => {
				expect(inRange(2000, "-")).toBe(true);
				expect(inRange(2000, "" as Range)).toBe(true);
				expect(inRange(2000, [] as unknown as Range)).toBe(true);
				expect(inRange(2000, [-Infinity, Infinity])).toBe(true);
			});

			it("undefined year should be true if trueIfNoYear is true", () => {
				expect(inRange(undefined, "1800-2000", true)).toBe(true);
				expect(inRange(undefined, "1800-", true)).toBe(true);
				expect(inRange(undefined, "-2000", true)).toBe(true);
				expect(inRange(undefined, [1800, 2000], true)).toBe(true);
				expect(inRange(undefined, [1800], true)).toBe(true);
				expect(inRange(undefined, [undefined, 2000], true)).toBe(true);
			});

			it("undefined year should be false if trueIfNoYear is false", () => {
				expect(inRange(undefined, "1800-2000", false)).toBe(false);
				expect(inRange(undefined, "1800-", false)).toBe(false);
				expect(inRange(undefined, "-2000", false)).toBe(false);
				expect(inRange(undefined, [1800, 2000], false)).toBe(false);
				expect(inRange(undefined, [1800], false)).toBe(false);
				expect(inRange(undefined, [undefined, 2000], false)).toBe(
					false
				);
			});
		});

		describe("Range Intersection Detection", () => {
			it("1800-1900 and 1850-1950 should be intersected", () => {
				expect(isIntersectedRange("1800-1900", "1850-1950")).toBe(true);
				expect(isIntersectedRange([1800, 1900], [1850, 1950])).toBe(
					true
				);
			});

			it("1800-1900 and 1901-2000 should not be intersected", () => {
				expect(isIntersectedRange("1800-1900", "1901-2000")).toBe(
					false
				);
				expect(isIntersectedRange([1800, 1900], [1901, 2000])).toBe(
					false
				);
			});

			it("1800- and -1900 should be intersected", () => {
				expect(isIntersectedRange("1800-", "-1900")).toBe(true);
				expect(isIntersectedRange([1800], [-Infinity, 1900])).toBe(
					true
				);
			});

			it("1800- and 1901- should be intersected", () => {
				expect(isIntersectedRange("1800-", "1901-")).toBe(true);
				expect(isIntersectedRange([1800], [1901, Infinity])).toBe(true);
			});

			it("undefined range should always be intersected", () => {
				expect(
					isIntersectedRange("" as Range, "1800-1900" as Range)
				).toBe(true);
				expect(
					isIntersectedRange("1800-1900" as Range, "" as Range)
				).toBe(true);
				expect(isIntersectedRange("" as Range, "" as Range)).toBe(true);
				expect(
					isIntersectedRange(
						[] as unknown as Range,
						"1800-1900" as Range
					)
				).toBe(true);
				expect(
					isIntersectedRange(
						"1800-1900" as Range,
						[] as unknown as Range
					)
				).toBe(true);
				expect(
					isIntersectedRange(
						[] as unknown as Range,
						[] as unknown as Range
					)
				).toBe(true);
			});
		});
	});
});
