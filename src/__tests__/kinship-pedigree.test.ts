import GedcomTree from "..";
import type { IndiKey, IndiType } from "../types/types";

// Tim is the foster child of Ferenc and Anna. Peti is their adopted child.
// Kata is Tim's wife. Geza is Ferenc's father.

const raw = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Tim /Margit/
2 GIVN Tim
2 SURN Margit
1 SEX M
1 FAMC @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Ferenc /Ozsvar/
2 GIVN Ferenc
2 SURN Ozsvar
1 SEX M
1 FAMC @F3@
1 FAMS @F1@
1 FAMS @F4@
0 @I3@ INDI
1 NAME Anna /Nevelo/
2 GIVN Anna
2 SURN Nevelo
1 SEX F
1 FAMS @F1@
1 FAMS @F4@
0 @I4@ INDI
1 NAME Nora /Testver/
2 GIVN Nora
2 SURN Testver
1 SEX F
1 FAMC @F1@
0 @I5@ INDI
1 NAME Kata /Feleseg/
2 GIVN Kata
2 SURN Feleseg
1 SEX F
1 FAMS @F2@
0 @I6@ INDI
1 NAME Geza /Nagyapa/
2 GIVN Geza
2 SURN Nagyapa
1 SEX M
1 FAMS @F3@
0 @I7@ INDI
1 NAME Peti /Nevelt/
2 GIVN Peti
2 SURN Nevelt
1 SEX M
1 FAMC @F4@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
2 _FREL foster
2 _MREL foster
1 CHIL @I4@
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I5@
0 @F3@ FAM
1 HUSB @I6@
1 CHIL @I2@
0 @F4@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I7@
2 _FREL adopted
2 _MREL adopted
0 TRLR`;

const { gedcom } = GedcomTree.parse(raw);

const indi = (id: number): IndiType | undefined =>
	gedcom.indi(`@I${id}@` as IndiKey);

const tim = indi(1);
const ferenc = indi(2);
const anna = indi(3);
const nora = indi(4);
const kata = indi(5);
const geza = indi(6);
const peti = indi(7);

describe("Hungarian pedigree adjectives follow the direction of the link", () => {
	it("calls a foster parent nevelő and a foster child nevelt", () => {
		expect(tim?.kinship(ferenc, false, "hu")).toEqual("nevelő apa");
		expect(tim?.kinship(ferenc, true, "hu")).toEqual("Tim nevelő apja");
		expect(tim?.kinship(anna, false, "hu")).toEqual("nevelő anya");
		expect(ferenc?.kinship(tim, false, "hu")).toEqual("nevelt gyermek");
		expect(ferenc?.kinship(tim, true, "hu")).toEqual(
			"Ferenc nevelt gyermeke"
		);
	});

	it("keeps nevelő on ancestors reached through the foster parent", () => {
		expect(tim?.kinship(geza, false, "hu")).toEqual("nevelő nagyapa");
	});

	it("keeps nevelt on the foster child's sibling", () => {
		expect(tim?.kinship(nora, false, "hu")).toEqual("nevelt testvér");
		expect(nora?.kinship(ferenc, false, "hu")).toEqual("apa");
	});

	it("uses nevelő in the in-law form", () => {
		expect(kata?.kinship(ferenc, false, "hu")).toEqual("nevelőapós");
	});

	it("calls an adoptive parent örökbefogadó and an adopted child örökbefogadott", () => {
		expect(peti?.kinship(ferenc, false, "hu")).toEqual("örökbefogadó apa");
		expect(peti?.kinship(anna, false, "hu")).toEqual("örökbefogadó anya");
		expect(anna?.kinship(peti, false, "hu")).toEqual(
			"örökbefogadott gyermek"
		);
	});
});
