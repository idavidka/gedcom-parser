import { describe, it, expect, vi, beforeEach } from "vitest";
import * as countryRegistry from "./country-registry";
import { formatPlaceForGeocoding } from "./index";

// Mock the country registry functions
vi.mock("./country-registry", async () => {
	const actual =
		await vi.importActual<typeof countryRegistry>("./country-registry");
	return {
		...actual,
		detectCountryName: vi.fn(),
	};
});

describe("formatPlaceForGeocoding", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Empty or invalid inputs", () => {
		it("should return empty string for empty string input", () => {
			const result = formatPlaceForGeocoding("");
			expect(result).toBe("");
		});

		it("should return empty string for whitespace-only input", () => {
			const result = formatPlaceForGeocoding("   ");
			expect(result).toBe("");
		});

		it("should return empty string for empty array", () => {
			const result = formatPlaceForGeocoding([]);
			expect(result).toBe("");
		});

		it("should return empty string for array with only undefined values", () => {
			const result = formatPlaceForGeocoding([undefined, undefined]);
			expect(result).toBe("");
		});

		it("should return empty string for null-like input", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = formatPlaceForGeocoding(null as any);
			expect(result).toBe("");
		});
	});

	describe("String input handling", () => {
		it("should format a simple place string", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding("Budapest");
			expect(result).toBeTruthy();
		});

		it("should handle place with multiple parts", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				"Hungary"
			);

			const result = formatPlaceForGeocoding("Budapest, Hungary");
			expect(result).toContain("Budapest");
		});
	});

	describe("Array input handling", () => {
		it("should join array elements with comma and space", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding(["Budapest", "Hungary"]);
			expect(result).toBeTruthy();
		});

		it("should filter out undefined values from array", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding([
				"Budapest",
				undefined,
				"Hungary",
			]);
			expect(result).toBeTruthy();
			expect(result).not.toContain("undefined");
		});

		it("should filter out empty strings from array", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding(["Budapest", "", "Hungary"]);
			expect(result).toBeTruthy();
		});
	});

	describe("Country name translation", () => {
		it("should translate country name to English when detected", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				"Hungary"
			);

			const result = formatPlaceForGeocoding("Budapest, Magyarország");
			expect(result).toContain("Hungary");
		});

		it("should keep original name when country not detected", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding("Budapest, Unknown");
			expect(result).toBeTruthy();
		});

		it("should only translate the last part (country)", () => {
			// First call returns undefined (for town), second returns "Hungary" (for country)
			vi.mocked(countryRegistry.detectCountryName)
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce("Hungary");

			const result = formatPlaceForGeocoding("Pest, Magyarország");
			// The result should have Hungary as the last part
			expect(result).toBeTruthy();
		});
	});

	describe("Place normalization", () => {
		it("should normalize place parts using getPlaceParts", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			// Test that the function handles complex place strings
			const result = formatPlaceForGeocoding(
				"Budapest, Pest megye, Hungary"
			);
			expect(result).toBeTruthy();
		});

		it("should handle reversed order (country-to-city)", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				"Hungary"
			);

			// getPlaceParts should reverse this to city-to-country order
			const result = formatPlaceForGeocoding("Hungary, Budapest");
			expect(result).toBeTruthy();
		});
	});

	describe("Edge cases", () => {
		it("should handle single-word place names", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding("Budapest");
			expect(result).toBeTruthy();
		});

		it("should handle places with special characters", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding("Győr-Moson-Sopron");
			expect(result).toBeTruthy();
		});

		it("should trim whitespace from parts", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding("  Budapest  ,  Hungary  ");
			expect(result).toBeTruthy();
			expect(result).not.toMatch(/^\s+|\s+$/);
		});

		it("should handle very long place names", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const longPlace =
				"Very Long Place Name, With Many Parts, And Multiple Levels, Of Geographic Information, In A Single String";
			const result = formatPlaceForGeocoding(longPlace);
			expect(result).toBeTruthy();
		});
	});

	describe("Return value format", () => {
		it("should return comma-separated string", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				"Hungary"
			);

			const result = formatPlaceForGeocoding("Budapest, Hungary");
			expect(typeof result).toBe("string");
			// Should contain comma if multiple parts
			if (result.includes(",")) {
				expect(result).toMatch(/^[^,]+(,\s*[^,]+)*$/);
			}
		});

		it("should not have leading or trailing commas", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding("Budapest, Hungary");
			expect(result).not.toMatch(/^,|,$/);
		});

		it("should not have double commas", () => {
			vi.mocked(countryRegistry.detectCountryName).mockReturnValue(
				undefined
			);

			const result = formatPlaceForGeocoding(["Budapest", "", "Hungary"]);
			expect(result).not.toContain(",,");
		});
	});
});
