import { describe, expect, it } from "vitest";

import GedcomTree from "..";
import { RelationType } from "../types/types";
import { deleteIndividual, unlinkRelative } from "../utils/family-edit";

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

	it("creates a new family when adding an extra parent who is not in the child's FAMC", () => {
		const gedcom = parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Child /Test/
1 SEX F
1 FAMC @F1@
0 @I2@ INDI
1 NAME Father /Test/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Mother /Test/
1 SEX F
1 FAMS @F1@
0 @I4@ INDI
1 NAME Extra /Parent/
1 SEX M
1 FAMS @F2@
0 @I5@ INDI
1 NAME ExtraSpouse /Parent/
1 SEX F
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I4@
1 WIFE @I5@
0 TRLR`);

		const child = gedcom.indi("@I1@");
		const extra = gedcom.indi("@I4@");
		const fam = child?.addParent(extra!);

		expect(fam?.id).toBe("@F3@");
		expect(gedcom.fam("@F2@")?.get("CHIL")?.toValue()).toBeUndefined();
		expect(gedcom.fam("@F3@")?.get("HUSB")?.toValue()).toBe("@I4@");
		expect(gedcom.fam("@F3@")?.get("CHIL")?.toValue()).toBe("@I1@");

		const parentIds: string[] = [];
		child?.getParents().forEach((item) => {
			if (item?.id) {
				parentIds.push(item.id);
			}
		});
		expect(parentIds.sort()).toEqual(["@I2@", "@I3@", "@I4@"]);

		const again = roundtrip(gedcom);
		const againParents: string[] = [];
		again.indi("@I1@")?.getParents().forEach((item) => {
			if (item?.id) {
				againParents.push(item.id);
			}
		});
		expect(againParents.sort()).toEqual(["@I2@", "@I3@", "@I4@"]);
		expect(again.fam("@F2@")?.get("CHIL")?.toValue()).toBeUndefined();
	});

	it("fills the missing spouse slot on the child's FAMC when adding a parent", () => {
		const gedcom = parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Child /Test/
1 SEX F
1 FAMC @F1@
0 @I2@ INDI
1 NAME Father /Test/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Mother /Test/
1 SEX F
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 TRLR`);

		const child = gedcom.indi("@I1@");
		const mother = gedcom.indi("@I3@");
		const fam = child?.addParent(mother!);

		expect(fam?.id).toBe("@F1@");
		expect(gedcom.fams()?.length).toBe(1);
		expect(gedcom.fam("@F1@")?.get("WIFE")?.toValue()).toBe("@I3@");

		const parentIds: string[] = [];
		child?.getParents().forEach((item) => {
			if (item?.id) {
				parentIds.push(item.id);
			}
		});
		expect(parentIds.sort()).toEqual(["@I2@", "@I3@"]);
	});

	it("unlinks a child from a family without deleting the person", () => {
		const gedcom = parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Father /Test/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mother /Test/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child /Test/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`);

		const father = gedcom.indi("@I1@")!;
		const child = gedcom.indi("@I3@")!;
		expect(unlinkRelative(father, child, "child")).toBe(true);
		expect(gedcom.fam("@F1@")?.get("CHIL")?.toValue()).toBeUndefined();
		expect(gedcom.indi("@I3@")?.get("FAMC")?.toValue()).toBeUndefined();
		expect(gedcom.indi("@I3@")).toBeDefined();
		expect(gedcom.fam("@F1@")?.get("HUSB")?.toValue()).toBe("@I1@");
	});

	it("unlinks a sibling from a shared childhood family", () => {
		const gedcom = parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME ChildA /Test/
1 SEX M
1 FAMC @F1@
0 @I2@ INDI
1 NAME ChildB /Test/
1 SEX F
1 FAMC @F1@
0 @I3@ INDI
1 NAME Father /Test/
1 SEX M
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I3@
1 CHIL @I1@
1 CHIL @I2@
0 TRLR`);

		const a = gedcom.indi("@I1@")!;
		const b = gedcom.indi("@I2@")!;
		expect(unlinkRelative(a, b, "sibling")).toBe(true);
		expect(gedcom.indi("@I2@")?.get("FAMC")?.toValue()).toBeUndefined();
		expect(
			gedcom.fam("@F1@")?.get("CHIL")?.toValueList()?.keys()
		).toEqual(["@I1@"]);
		expect(gedcom.indi("@I2@")).toBeDefined();
	});

	it("deletes an individual and cleans family pointers", () => {
		const gedcom = parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Father /Test/
1 SEX M
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mother /Test/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child /Test/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`);

		expect(deleteIndividual(gedcom, "@I3@")).toBe(true);
		expect(gedcom.indi("@I3@")).toBeUndefined();
		expect(gedcom.fam("@F1@")?.get("CHIL")?.toValue()).toBeUndefined();
		expect(gedcom.indi("@I1@")).toBeDefined();
	});
});
