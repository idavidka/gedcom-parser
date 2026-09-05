import { describe, expect, it } from "vitest";

import { createEmptyGedcom } from "../utils/parser";

describe("multimedia attach / GEDZIP", () => {
	it("creates a GEDCOM 7 OBJE and attaches it to an individual", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		indi.set("NAME", "Test /Person/");

		const obje = indi.attachMediaFromUrl("https://example.com/photo.jpg", {
			title: "Portrait",
			mediType: "photo",
			primary: true,
			gedcomVersion: "7.0",
		});

		expect(obje?.id).toMatch(/^@O\d+@$/);
		expect(obje?.get("FILE")?.toValue()).toBe(
			"https://example.com/photo.jpg"
		);
		expect(obje?.get("FILE.FORM")?.toValue()).toBe("jpg");
		expect(obje?.get("FILE.FORM.TYPE")?.toValue()).toBe("photo");
		expect(obje?.get("FILE.TITL")?.toValue()).toBe("Portrait");
		expect(obje?.get("_PRIM")?.toValue()).toBe("Y");

		const link = indi.get("OBJE")?.toValue();
		expect(link).toBe(obje?.id);

		const text = gedcom.toGedcom(undefined, 0, {
			gedcomVersion: "7.0",
			original: true,
		});
		expect(text).toContain("0 @O1@ OBJE");
		expect(text).toContain("1 FILE https://example.com/photo.jpg");
		expect(text).toContain("2 FORM jpg");
		expect(text).toContain("3 TYPE photo");
		expect(text).toContain(`1 OBJE ${obje?.id}`);
	});

	it("maps MEDI to FORM.TYPE on GEDCOM 7 standardize and back on 5.5.1", () => {
		const gedcom = createEmptyGedcom();
		const indi = gedcom.createIndividual();
		const obje = gedcom.createMultimediaRecord({
			file: "https://example.com/scan.png",
			title: "Scan",
			mediType: "photo",
			gedcomVersion: "5.5.1",
		});
		indi.attachMultimedia(obje!);

		expect(obje?.get("MEDI")?.toValue()).toBe("photo");

		const as7 = gedcom.toGedcom(undefined, 0, { gedcomVersion: "7.0" });
		expect(as7).toContain("2 FORM png");
		expect(as7).toContain("3 TYPE photo");
		expect(as7).not.toMatch(/\n1 MEDI /);

		const as551 = gedcom.toGedcom(undefined, 0, {
			gedcomVersion: "5.5.1",
		});
		expect(as551).toContain("1 FORM png");
		expect(as551).toContain("1 MEDI photo");
		expect(as551).not.toContain("3 TYPE photo");
	});

	it("collects multimedia and packs GEDZIP via toGedzip", async () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		indi.attachMediaFromUrl("https://example.com/a.jpg", {
			gedcomVersion: "7.0",
		});

		const media = await gedcom.collectMultimedia();
		expect(Object.keys(media).length).toBeGreaterThan(0);

		const bytes = await gedcom.toGedzip({
			original: true,
			media: [
				{
					url: "https://example.com/a.jpg",
					imgId: "a",
					contentType: "jpg",
					content:
						"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB/9k=",
				},
			],
		});

		expect(bytes.byteLength).toBeGreaterThan(0);
		const JSZip = (await import("jszip")).default;
		const zip = await JSZip.loadAsync(bytes);
		expect(Object.keys(zip.files)).toContain("gedcom.ged");
		expect(
			Object.keys(zip.files).some((name) => name.startsWith("media/"))
		).toBe(true);
		const text = await zip.file("gedcom.ged")?.async("string");
		expect(text).toContain("1 FILE media/a.jpg");
		expect(text).not.toContain("https://example.com/a.jpg");
	});
});
