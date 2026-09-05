import { describe, expect, it } from "vitest";

import {
	GEDZIP_GEDCOM_ENTRY,
	buildGedzip,
	extractGedzip,
	rewriteGedcomFilePaths,
} from "../utils/gedzip";

describe("GEDZIP", () => {
	it("rewrites FILE http(s) payloads to media/ paths", () => {
		const raw = [
			"0 HEAD",
			"1 GEDC",
			"2 VERS 7.0",
			"0 @O1@ OBJE",
			"1 FILE https://example.com/a.jpg",
			"0 TRLR",
		].join("\n");

		const rewritten = rewriteGedcomFilePaths(
			raw,
			new Map([["https://example.com/a.jpg", "media/a.jpg"]])
		);

		expect(rewritten).toContain("1 FILE media/a.jpg");
		expect(rewritten).not.toContain("https://example.com/a.jpg");
	});

	it("builds a zip containing gedcom.ged and media entries", async () => {
		const raw = [
			"0 HEAD",
			"1 GEDC",
			"2 VERS 7.0",
			"0 @O1@ OBJE",
			"1 FILE https://example.com/a.jpg",
			"0 @I1@ INDI",
			"1 NAME Test /One/",
			"0 TRLR",
		].join("\n");

		const bytes = await buildGedzip(raw, [
			{
				url: "https://example.com/a.jpg",
				imgId: "a",
				contentType: "jpg",
				content:
					"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB/9k=",
			},
		]);

		expect(bytes.byteLength).toBeGreaterThan(0);

		const JSZip = (await import("jszip")).default;
		const zip = await JSZip.loadAsync(bytes);
		expect(Object.keys(zip.files)).toContain(GEDZIP_GEDCOM_ENTRY);
		expect(Object.keys(zip.files).some((name) => name.startsWith("media/"))).toBe(
			true
		);
		const text = await zip.file(GEDZIP_GEDCOM_ENTRY)?.async("string");
		expect(text).toContain("2 VERS 7.0");
		expect(text).toContain("1 FILE media/a.jpg");
		expect(text).not.toContain("https://example.com/a.jpg");
	});

	it("extracts gedcom.ged preferentially from a GEDZIP", async () => {
		const JSZip = (await import("jszip")).default;
		const zip = new JSZip();
		zip.file("other.ged", "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR\n");
		zip.file(
			GEDZIP_GEDCOM_ENTRY,
			"0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n"
		);
		zip.file("media/x.jpg", "fake");
		const bytes = await zip.generateAsync({ type: "uint8array" });

		const extracted = await extractGedzip(bytes);
		expect(extracted.entryName).toBe(GEDZIP_GEDCOM_ENTRY);
		expect(extracted.gedcomText).toContain("2 VERS 7.0");
		expect(extracted.mediaEntries.some((m) => m.path === "media/x.jpg")).toBe(
			true
		);

		const { remountGedzipMediaAsDataUrls } = await import("../utils/gedzip");
		const remounted = remountGedzipMediaAsDataUrls({
			...extracted,
			gedcomText:
				"0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @O1@ OBJE\n1 FILE media/x.jpg\n0 TRLR\n",
		});
		expect(remounted).toContain("1 FILE data:image/jpeg;base64,");
		expect(remounted).not.toContain("1 FILE media/x.jpg");
	});
});
