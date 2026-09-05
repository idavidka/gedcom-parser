import { describe, expect, it } from "vitest";

import { createCommonDate } from "../classes/date";
import { createEmptyGedcom } from "../utils/parser";
import { applyGedcom7Enumerations } from "../utils/gedcom7-enumerations";

describe("GEDCOM 7 enumerations", () => {
	it("moves non-standard SEX and PEDI into PHRASE and restores afterwards", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		indi.set("SEX", "nonbinary");
		const child = gedcom.createIndividual();
		indi.addChild(child, "step");

		const text = gedcom.toGedcom(undefined, 0, {
			original: true,
			gedcomVersion: "7.0",
		});

		expect(text).toMatch(/1 SEX\s*\n2 PHRASE nonbinary/);
		expect(text).toMatch(/2 PEDI\s*\n3 PHRASE step|1 PEDI\s*\n2 PHRASE step/);

		// Live dataset must be restored after export.
		expect(indi.get("SEX")?.toValue()).toBe("nonbinary");
		expect(indi.get("SEX")?.get("PHRASE")?.toValue()).toBeUndefined();
	});

	it("normalizes valid SEX/PEDI values without PHRASE", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		indi.set("SEX", "m");
		const restore = applyGedcom7Enumerations(gedcom);
		expect(indi.get("SEX")?.toValue()).toBe("M");
		restore();
		expect(indi.get("SEX")?.toValue()).toBe("m");
	});
});

describe("GEDCOM 7 shared notes", () => {
	it("creates an SNOTE record and links it from an individual", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		const note = gedcom.createSharedNote("Shared research note");
		indi.attachSharedNote(note);

		expect(note.id).toMatch(/^@N\d+@$/);
		expect(note.type).toBe("SNOTE");
		expect(indi.get("NOTE")?.toValue()).toBe(note.id);

		const text = gedcom.toGedcom(undefined, 0, {
			original: true,
			gedcomVersion: "7.0",
		});
		expect(text).toContain(`0 ${note.id} SNOTE Shared research note`);
		expect(text).toContain(`1 NOTE ${note.id}`);
	});
});

describe("GEDCOM 7 SCHMA and ROLE", () => {
	it("writes HEAD.SCHMA extension tags on GEDCOM 7 export", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		gedcom.registerExtensionTag(
			"_SKYPEID",
			"http://xmlns.com/foaf/0.1/skypeID"
		);

		const text = gedcom.toGedcom(undefined, 0, {
			original: true,
			gedcomVersion: "7.0",
		});
		expect(text).toContain("1 SCHMA");
		expect(text).toContain("2 TAG _ORIGHEAD https://treeviz.com/gedcom#_ORIGHEAD");
		expect(text).toContain(
			"2 TAG _SKYPEID http://xmlns.com/foaf/0.1/skypeID"
		);
	});

	it("moves non-standard ROLE into PHRASE", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		const other = gedcom.createIndividual();
		const asso = indi.set("ASSO", other.id!);
		asso!.refType = "INDI";
		asso!.set("ROLE", "teacher");

		const text = gedcom.toGedcom(undefined, 0, {
			original: true,
			gedcomVersion: "7.0",
		});
		expect(text).toMatch(/2 ROLE\s*\n3 PHRASE teacher/);
	});
});

describe("GEDCOM 7 dates", () => {
	it("preserves JULIAN calendar on export", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		const birth = indi.set("BIRT", "");
		const date = createCommonDate(gedcom);
		date.value = "JULIAN 12 FEB 1800";
		birth!.set("DATE", date);

		expect(date.calendar).toBe("JULIAN");
		expect(date.exportValue()).toContain("JULIAN");
		expect(date.exportValue()).toMatch(/12 FEB 1800/i);
	});

	it("keeps BET/AND and FROM/TO DateValue payloads opaque", () => {
		const date = createCommonDate();
		date.value = "BET 1900 AND 1910";
		expect(date.exportValue()).toBe("BET 1900 AND 1910");
		expect(date.DAY).toBeUndefined();

		date.value = "FROM 1670 TO 1800";
		expect(date.exportValue()).toBe("FROM 1670 TO 1800");
	});
});

describe("GEDCOM 7 non-event and metadata", () => {
	it("adds NO MARR with a DatePeriod", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		indi.addNonEvent({ event: "MARR", date: "TO 24 MAR 1880" });

		const text = gedcom.toGedcom(undefined, 0, {
			original: true,
			gedcomVersion: "7.0",
		});
		expect(text).toContain("1 NO MARR");
		expect(text).toContain("2 DATE TO 24 MAR 1880");
	});

	it("backfills UID/CREA/CHAN on GEDCOM 7 export then restores", () => {
		const gedcom = createEmptyGedcom();
		gedcom.applyExportVersion("7.0");
		const indi = gedcom.createIndividual();
		// Clear UID added by createIndividual for a clean backfill check.
		indi.remove("UID");

		const text = gedcom.toGedcom(undefined, 0, {
			original: true,
			gedcomVersion: "7.0",
		});
		expect(text).toMatch(/1 UID /);
		expect(text).toMatch(/1 CREA\s*\n2 DATE /);
		expect(text).toMatch(/1 CHAN\s*\n2 DATE /);

		expect(indi.get("UID")?.toValue()).toBeUndefined();
		expect(indi.get("CREA")).toBeUndefined();
		expect(indi.get("CHAN")).toBeUndefined();
	});
});
