import GedcomTree from "..";
import { type IndiKey } from "../types/types";
import { Indi, type IndiType } from "../classes";
import { textFileLoader, createPersonIdGetter } from "./test-utils";

const mock = textFileLoader("src/__tests__/mocks/mock.ged");

const persons = {
	JI2: "@I200015401409",
	NB1: "@I200015400760",
	DI1: "@I38561572439",
	ESz1: "@I38561572440",
	HL1: "@I38561572453",
	HM1: "@I38561572549",
	RN1: "@I38561572572",
	AN1: "@I38561572578",
	CN1: "@I38561572582",
	GB1: "@I200015402448",
	GB2: "@I200015402368",
	EV1: "@I202500670319",

	VP1: "@I38561572634@",
	ISz1: "@I38561572877@",
	ESz2: "@I38561572548@",
	LI1: "@I38561572441@",
	ASz1: "@I38561573009@",
	AB1: "@I202523035548@",
	MN1: "@I202524394832@",
	ZsE1: "@I38561572455@",
	JSz1: "@I38561572452@",
};

type Person = keyof typeof persons;
const getPersonId = createPersonIdGetter(persons);

describe("Individual (INDI) Class Functionality", () => {
	describe("Individual Object Creation", () => {
		it("should return with a new Common", () => {
			const { gedcom: testGedcom } = GedcomTree.parse(mock);

			expect(testGedcom.indi(1)).toBeInstanceOf(Indi);
		});
	});

	describe("Kinship Relationships", () => {
		const { gedcom: g } = GedcomTree.parse(mock);

		const indis = Object.keys(persons).reduce<
			Partial<Record<Person, IndiType>>
		>((acc, id) => {
			acc[id as Person] = g.indi(getPersonId(id as Person));

			return acc;
		}, {});

		describe("DI1", () => {
			it("should be JI2's father", () => {
				expect(indis.DI1?.kinship(indis.JI2)).toEqual("daughter");
				expect(indis.JI2?.kinship(indis.DI1)).toEqual("father");
			});

			it("should be ESz1's son", () => {
				expect(indis.DI1?.kinship(indis.ESz1)).toEqual("mother");
				expect(indis.ESz1?.kinship(indis.DI1)).toEqual("son");
			});

			it("should be HL1's grandson", () => {
				expect(indis.DI1?.kinship(indis.HL1)).toEqual("grandmother");
				expect(indis.HL1?.kinship(indis.DI1)).toEqual("grandson");
			});

			it("should be GB2's son-in-law", () => {
				expect(indis.DI1?.kinship(indis.GB2)).toEqual("father-in-law");
				expect(indis.GB2?.kinship(indis.DI1)).toEqual("son-in-law");
			});

			it("should be NB1's husband", () => {
				expect(indis.DI1?.kinship(indis.NB1, false)).toEqual("wife");
				expect(indis.DI1?.kinship(indis.NB1, true)).toEqual(
					"D L's wife"
				);
				expect(indis.DI1?.kinship(indis.NB1, false, "hu")).toEqual(
					"feleség"
				);
				expect(indis.DI1?.kinship(indis.NB1, true, "hu")).toEqual(
					"D L felesége"
				);

				expect(indis.NB1?.kinship(indis.DI1)).toEqual("husband");
			});

			it("should be GB1's brother-in-law", () => {
				expect(indis.DI1?.kinship(indis.GB1)).toEqual("brother-in-law");
				expect(indis.GB1?.kinship(indis.DI1)).toEqual("brother-in-law");
			});

			it("should be husband of EV1's great-granddaughter", () => {
				expect(indis.DI1?.kinship(indis.EV1)).toEqual(
					"great-grandmother of wife"
				);
				expect(indis.EV1?.kinship(indis.DI1)).toEqual(
					"husband of great-granddaughter"
				);
			});

			it("should be husband of VP1's 3rd cousin", () => {
				expect(indis.DI1?.kinship(indis.VP1)).toEqual("3rd cousin");
				expect(indis.VP1?.kinship(indis.DI1)).toEqual("3rd cousin");
			});

			it("should be Illés Szabós's grandnephew", () => {
				expect(indis.DI1?.kinship(indis.ISz1)).toEqual("granduncle");

				expect(indis.ISz1?.kinship(indis.DI1)).toEqual("grandnephew");
			});

			it("should be ZsE1' half-brother", () => {
				expect(indis.DI1?.kinship(indis.ZsE1)).toEqual("half-brother");

				expect(indis.ZsE1?.kinship(indis.DI1)).toEqual("half-brother");
			});

			it("should be MN1's 7th cousin -1x removed", () => {
				expect(indis.DI1?.kinship(indis.MN1)).toEqual(
					"7th cousin 1x removed"
				);

				expect(indis.MN1?.kinship(indis.DI1)).toEqual(
					"7th cousin -1x removed"
				);
			});

			it("should be Mark MN1's 1st cousin -2x removed", () => {
				expect(indis.DI1?.kinship(indis.ASz1)).toEqual(
					"1st cousin 2x removed"
				);

				expect(indis.ASz1?.kinship(indis.DI1)).toEqual(
					"1st cousin -2x removed"
				);
			});

			it("should be ESz2's nephew", () => {
				expect(indis.DI1?.kinship(indis.ESz2)).toEqual("aunt");

				expect(indis.ESz2?.kinship(indis.DI1)).toEqual("nephew");
			});

			it("should be JSz1's grandson", () => {
				expect(indis.DI1?.kinship(indis.JSz1)).toEqual("grandfather");

				expect(indis.JSz1?.kinship(indis.DI1)).toEqual("grandson");
			});
		});

		describe("NB1", () => {
			it("should be GB1's sister", () => {
				expect(indis.NB1?.kinship(indis.GB1)).toEqual("brother");

				expect(indis.GB1?.kinship(indis.NB1)).toEqual("sister");
			});

			it("should be ESz1's daughter-in-law", () => {
				expect(indis.NB1?.kinship(indis.ESz1)).toEqual("mother-in-law");

				expect(indis.ESz1?.kinship(indis.NB1)).toEqual(
					"daughter-in-law"
				);
			});

			it("should be wife of Illés Szabós's grandnephew", () => {
				expect(indis.NB1?.kinship(indis.ISz1)).toEqual(
					"granduncle of husband"
				);

				expect(indis.ISz1?.kinship(indis.NB1)).toEqual(
					"wife of grandnephew"
				);
			});

			it("should be ZsE1' sister-in-law", () => {
				expect(indis.NB1?.kinship(indis.ZsE1)).toEqual(
					"brother-in-law"
				);

				expect(indis.ZsE1?.kinship(indis.NB1)).toEqual("sister-in-law");
			});

			it("should be wife of AB1' great-grandson", () => {
				expect(indis.NB1?.kinship(indis.AB1)).toEqual(
					"3rd great-grandmother of husband"
				);

				expect(indis.AB1?.kinship(indis.NB1)).toEqual(
					"wife of 3rd great-grandson"
				);
			});
		});
	});
});
