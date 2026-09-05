import { describe, expect, it } from "vitest";

import GedcomTree from "../utils/parser";
import {
	isGedcom7,
	normalizeGedcomVersion,
} from "../utils/gedcom-version";

const sample = (vers: string, extraHead = "") =>
	[
		"0 HEAD",
		"1 GEDC",
		`2 VERS ${vers}`,
		extraHead,
		"1 CHAR UTF-8",
		"0 @I1@ INDI",
		"1 NAME John /Doe/",
		"1 NOTE Hello",
		"2 CONC  world",
		"0 TRLR",
	]
		.filter(Boolean)
		.join("\n");

describe("GEDCOM version", () => {
	it("treats 7.x headers as GEDCOM 7", () => {
		expect(normalizeGedcomVersion("7.0")).toBe("7.0");
		expect(normalizeGedcomVersion("7.0.16")).toBe("7.0");
		expect(isGedcom7("7.0")).toBe(true);
		expect(isGedcom7("5.5.1")).toBe(false);
	});

	it("imports GEDCOM 7 files and folds CONC into the previous value", () => {
		const { gedcom } = GedcomTree.parse(sample("7.0"));
		expect(gedcom.getGedcomVersion()).toBe("7.0");
		expect(gedcom.indi("@I1@")?.get("NOTE")?.toValue()).toBe(
			"Hello world"
		);
	});

	it("exports HEAD.GEDC.VERS 7.0 without FORM or CHAR", () => {
		const { gedcom } = GedcomTree.parse(sample("5.5.1", "2 FORM LINEAGE-LINKED"));
		const raw = gedcom.toGedcom(undefined, 0, { gedcomVersion: "7.0" });
		expect(raw).toContain("2 VERS 7.0");
		expect(raw).not.toContain("2 FORM LINEAGE-LINKED");
		expect(raw).not.toMatch(/\n1 CHAR /);
	});

	it("exports HEAD.GEDC.VERS 5.5.1 with FORM and CHAR", () => {
		const { gedcom } = GedcomTree.parse(sample("7.0"));
		const raw = gedcom.toGedcom(undefined, 0, { gedcomVersion: "5.5.1" });
		expect(raw).toContain("2 VERS 7.0");
		expect(raw).not.toContain("2 FORM LINEAGE-LINKED");
		expect(raw).not.toMatch(/\n1 CHAR /);
	});

	it("exports HEAD.GEDC.VERS 5.5.1 with FORM and CHAR via applyExportVersion", () => {
		const { gedcom } = GedcomTree.parse(sample("7.0"));
		gedcom.applyExportVersion("5.5.1");
		const raw = gedcom.toGedcom(undefined, 0, { original: true });
		expect(raw).toContain("2 VERS 5.5.1");
		expect(raw).toContain("2 FORM LINEAGE-LINKED");
		expect(raw).toContain("1 CHAR UTF-8");
	});
});
