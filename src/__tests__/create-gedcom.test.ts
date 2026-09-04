import { describe, expect, it } from "vitest";

import GedcomTree, { createEmptyGedcom } from "..";

const roundtrip = (gedcom: ReturnType<typeof createEmptyGedcom>) => {
	const { gedcom: again } = GedcomTree.parse(
		gedcom.toGedcom(undefined, undefined, { original: true })
	);
	if (!again) {
		throw new Error("Failed to roundtrip GEDCOM");
	}
	return again;
};

describe("createEmptyGedcom", () => {
	it("creates a HEAD / CHAR / TRLR file that can hold people", () => {
		const gedcom = createEmptyGedcom({ filename: "MyTree.ged" });
		const person = gedcom.createIndividual();
		person.set("NAME", "Eva /Kiss/");
		person.set("SEX", "F");
		person.addFact({
			tag: "OCCU",
			value: "Teacher",
			date: "1880",
			place: "Kolozsvar",
		});

		expect(gedcom.get("TRLR")).toBeUndefined();
		const again = roundtrip(gedcom);
		expect(again.get("TRLR")).toBeUndefined();
		const lines = again.toGedcom(undefined, undefined, { original: true });
		expect(lines).toContain("0 HEAD");
		expect(lines).toContain("1 CHAR UTF-8");
		expect(lines.match(/^0 TRLR$/gm)).toEqual(["0 TRLR"]);
		expect(lines.trimEnd().endsWith("0 TRLR")).toBe(true);
		expect(lines.indexOf("0 TRLR")).toBeGreaterThan(lines.indexOf("0 @"));
		expect(again.indi(person.id!)?.get("OCCU")?.toValue()).toBe("Teacher");
		expect(
			again.indi(person.id!)?.get("OCCU")?.get("PLAC")?.toValue()
		).toBe("Kolozsvar");
	});

	it("writes EVEN + TYPE for custom facts", () => {
		const gedcom = createEmptyGedcom();
		const person = gedcom.createIndividual();
		person.addFact({
			tag: "EVEN",
			type: "Also Known As",
			note: "Edit",
		});

		const again = roundtrip(gedcom);
		const event = again.indi(person.id!)?.get("EVEN");
		expect(event?.get("TYPE")?.toValue()).toBe("Also Known As");
		expect(event?.get("NOTE")?.toValue()).toBe("Edit");
	});

	it("keeps a single TRLR at the end across repeated exports", () => {
		const gedcom = createEmptyGedcom();
		gedcom.createIndividual().set("NAME", "Eva /Kiss/");

		let raw = gedcom.toGedcom(undefined, undefined, { original: true });
		for (let index = 0; index < 6; index++) {
			const { gedcom: again } = GedcomTree.parse(raw);
			raw = again.toGedcom(undefined, undefined, { original: true });
		}

		expect(raw.match(/^0 TRLR$/gm)).toEqual(["0 TRLR"]);
		expect(raw.trimEnd().endsWith("0 TRLR")).toBe(true);
	});

	it("does not store TRLR as a GEDCOM record", () => {
		const { gedcom } = GedcomTree.parse(
			[
				"0 HEAD",
				"1 CHAR UTF-8",
				"0 TRLR",
				"0 TRLR",
				"0 @I1@ INDI",
				"1 NAME Eva /Kiss/",
				"0 TRLR",
				"0 TRLR",
			].join("\n")
		);

		expect(gedcom.get("TRLR")).toBeUndefined();
		gedcom.assign("TRLR", gedcom.get("HEAD")!);
		expect(gedcom.get("TRLR")).toBeUndefined();

		const raw = gedcom.toGedcom(undefined, undefined, { original: true });
		expect(raw.match(/^0 TRLR$/gm)).toEqual(["0 TRLR"]);
		expect(raw.trimEnd().endsWith("0 TRLR")).toBe(true);
		expect(raw.indexOf("0 TRLR")).toBeGreaterThan(raw.indexOf("0 @I1@ INDI"));
	});
});
