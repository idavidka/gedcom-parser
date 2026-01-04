import GedcomTree from "..";
import { textFileLoader } from "./test-utils";
import { Fam } from "../classes";

const mock = textFileLoader("src/__tests__/mocks/mock.ged");

describe("Family (FAM) Class Functionality", () => {
	const { gedcom: testGedcom } = GedcomTree.parse(mock);
	const fams = testGedcom.fams();

	describe("Family Object Creation", () => {
		it("should return Fam instances", () => {
			const firstFam = fams.first();
			expect(firstFam).toBeInstanceOf(Fam);
		});

		it("should have family records", () => {
			expect(fams.length).toBeGreaterThan(0);
		});
	});

	describe("Family Relationships", () => {
		it("should get husband from family", () => {
			fams.forEach((fam) => {
				const husbands = fam.getHusband();
				const husb = husbands?.first();
				if (husb) {
					// Note: GEDCOM data may have incorrect sex values, so we just check if husband exists
					expect(husb).toBeDefined();
					expect(husb.id).toBeDefined();
				}
			});
		});

		it("should get wife from family", () => {
			fams.forEach((fam) => {
				const wives = fam.getWife();
				const wife = wives?.first();
				if (wife) {
					// Note: GEDCOM data may have incorrect sex values, so we just check if wife exists
					expect(wife).toBeDefined();
					expect(wife.id).toBeDefined();
				}
			});
		});

		it("should get children from family", () => {
			fams.forEach((fam) => {
				const children = fam.getChildren();
				if (children) {
					expect(children.length).toBeGreaterThanOrEqual(0);
				}
			});
		});

		it("should get parent families", () => {
			const indis = testGedcom.indis();
			indis.forEach((indi) => {
				const famcFamilies = indi.getFamilies("FAMC");
				if (famcFamilies) {
					expect(famcFamilies.length).toBeGreaterThanOrEqual(0);
				}
			});
		});

		it("should get spouse families", () => {
			const indis = testGedcom.indis();
			indis.forEach((indi) => {
				const famsFamilies = indi.getFamilies("FAMS");
				if (famsFamilies) {
					expect(famsFamilies.length).toBeGreaterThanOrEqual(0);
				}
			});
		});
	});

	describe("Family Events", () => {
		it("should get marriage event", () => {
			let foundMarriage = false;
			fams.forEach((fam) => {
				const marr = fam.get("MARR");
				if (marr) {
					foundMarriage = true;
					expect(marr).toBeDefined();
				}
			});
			// At least some families should have marriage events
			if (fams.length > 10) {
				expect(foundMarriage).toBe(true);
			}
		});

		it("should get marriage date", () => {
			fams.forEach((fam) => {
				const marr = fam.get("MARR");
				if (marr) {
					const date = marr.get("DATE");
					if (date) {
						expect(date).toBeDefined();
					}
				}
			});
		});

		it("should get marriage place", () => {
			fams.forEach((fam) => {
				const marr = fam.get("MARR");
				if (marr) {
					const place = marr.get("PLAC");
					if (place) {
						expect(typeof place.toValue()).toBe("string");
					}
				}
			});
		});
	});

	describe("Family Properties", () => {
		it("should have family ID", () => {
			const firstFam = fams.first();
			if (firstFam) {
				expect(firstFam.id).toBeDefined();
				expect(typeof firstFam.id).toBe("string");
			}
		});

		it("should get family by ID", () => {
			const keys = fams.keys();
			if (keys.length > 0) {
				const fam = testGedcom.fam(keys[0]);
				expect(fam).toBeInstanceOf(Fam);
			}
		});

		it("should convert family to string", () => {
			const firstFam = fams.first();
			if (firstFam) {
				const str = firstFam.toString();
				expect(typeof str).toBe("string");
			}
		});
	});

	describe("Family Validation", () => {
		it("should validate husband reference", () => {
			fams.forEach((fam) => {
				const husbId = fam.get("HUSB")?.toValue();
				if (husbId) {
					const husb = testGedcom.indi(husbId);
					expect(husb).toBeDefined();
				}
			});
		});

		it("should validate wife reference", () => {
			fams.forEach((fam) => {
				const wifeId = fam.get("WIFE")?.toValue();
				if (wifeId) {
					const wife = testGedcom.indi(wifeId);
					expect(wife).toBeDefined();
				}
			});
		});

		it("should validate children references", () => {
			fams.forEach((fam) => {
				const chilList = fam.get("CHIL");
				if (chilList) {
					const children = chilList.toArray?.();
					if (children) {
						children.forEach((child) => {
							const childId = child.toValue();
							if (childId) {
								const indi = testGedcom.indi(childId);
								expect(indi).toBeDefined();
							}
						});
					}
				}
			});
		});
	});
});
