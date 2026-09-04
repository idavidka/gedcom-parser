import { describe, expect, it } from "vitest";

import GedcomTree from "..";
import { RelationType } from "../types/types";

const parse = (raw: string) => {
	const { gedcom } = GedcomTree.parse(raw);
	if (!gedcom) {
		throw new Error("Failed to parse GEDCOM");
	}
	return gedcom;
};

const roundtrip = (gedcom: ReturnType<typeof parse>) =>
	parse(gedcom.toGedcom(undefined, undefined, { original: true }));

const sample = () =>
	parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Janos /Nagy/
1 SEX M
0 TRLR`);

describe("family graph writes", () => {
	it("creates individuals and families with sequential ids", () => {
		const gedcom = sample();
		const person = gedcom.createIndividual();
		person.set("NAME", "Eva /Kiss/");
		person.set("SEX", "F");
		const fam = gedcom.createFamily();

		expect(person.id).toBe("@I2@");
		expect(fam.id).toBe("@F1@");
		expect(roundtrip(gedcom).indi("@I2@")?.get("SEX")?.toValue()).toBe("F");
		expect(roundtrip(gedcom).fam("@F1@")).toBeDefined();
	});

	it("links spouses through FAMS / HUSB / WIFE", () => {
		const gedcom = sample();
		const husband = gedcom.indi("@I1@");
		const wife = gedcom.createIndividual();
		wife.set("NAME", "Ilona /Toth/");
		wife.set("SEX", "F");

		const fam = husband?.addSpouse(wife);
		expect(fam?.id).toBe("@F1@");

		const again = roundtrip(gedcom);
		expect(again.fam("@F1@")?.get("HUSB")?.toValue()).toBe("@I1@");
		expect(again.fam("@F1@")?.get("WIFE")?.toValue()).toBe("@I2@");
		expect(again.indi("@I1@")?.get("FAMS")?.toValue()).toBe("@F1@");
		expect(again.indi("@I2@")?.get("FAMS")?.toValue()).toBe("@F1@");
	});

	it("adds an adopted child with PEDI and _FREL", () => {
		const gedcom = sample();
		const parent = gedcom.indi("@I1@");
		const child = gedcom.createIndividual();
		child.set("NAME", "Pista /Nagy/");
		child.set("SEX", "M");

		const fam = parent?.addChild(child, RelationType.ADOPTED);
		expect(fam?.id).toBe("@F1@");

		const again = roundtrip(gedcom);
		const famc = again.indi("@I2@")?.get("FAMC");
		expect(famc?.toValue()).toBe("@F1@");
		expect(famc?.get("PEDI")?.toValue()).toBe(RelationType.ADOPTED);
		expect(again.fam("@F1@")?.get("HUSB")?.toValue()).toBe("@I1@");
		expect(again.fam("@F1@")?.get("CHIL")?.toValue()).toBe("@I2@");
		expect(
			again.fam("@F1@")?.get("CHIL")?.get("_FREL")?.toValue()
		).toBe(RelationType.ADOPTED);
	});

	it("adds a parent by attaching the current person as a child", () => {
		const gedcom = sample();
		const person = gedcom.indi("@I1@");
		const parent = gedcom.createIndividual();
		parent.set("NAME", "Gabor /Nagy/");
		parent.set("SEX", "M");

		person?.addParent(parent);

		const again = roundtrip(gedcom);
		const parentIds: string[] = [];
		again.indi("@I1@")?.getParents().forEach((item) => {
			if (item.id) {
				parentIds.push(item.id);
			}
		});
		expect(parentIds).toEqual(["@I2@"]);
	});

	it("reuses a single spouse family when adding a child", () => {
		const gedcom = sample();
		const father = gedcom.indi("@I1@");
		const mother = gedcom.createIndividual();
		mother.set("SEX", "F");
		const child = gedcom.createIndividual();
		child.set("SEX", "M");

		father?.addSpouse(mother);
		father?.addChild(child);

		const again = roundtrip(gedcom);
		expect(again.fams()?.length).toBe(1);
		expect(again.fam("@F1@")?.get("WIFE")?.toValue()).toBe("@I2@");
		expect(again.fam("@F1@")?.get("CHIL")?.toValue()).toBe("@I3@");
	});
});
