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

		const again = roundtrip(gedcom);
		const lines = again.toGedcom(undefined, undefined, { original: true });
		expect(lines).toContain("0 HEAD");
		expect(lines).toContain("1 CHAR UTF-8");
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
});
