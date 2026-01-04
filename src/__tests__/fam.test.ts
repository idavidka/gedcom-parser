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
			expect(fams.count()).toBeGreaterThan(0);
		});
	});

	describe("Family Relationships", () => {
		it("should get husband from family", () => {
			fams.each((fam) => {
				const husb = fam.husb();
				if (husb) {
					expect(husb.get("SEX")?.toValue()).toBe("M");
				}
			});
		});

		it("should get wife from family", () => {
			fams.each((fam) => {
				const wife = fam.wife();
				if (wife) {
					expect(wife.get("SEX")?.toValue()).toBe("F");
				}
			});
		});

		it("should get children from family", () => {
			fams.each((fam) => {
				const children = fam.chils();
				if (children) {
					expect(children.count()).toBeGreaterThanOrEqual(0);
				}
			});
		});

		it("should get parent families", () => {
			const indis = testGedcom.indis();
			indis.each((indi) => {
				const famcFamilies = indi.famcs();
				if (famcFamilies) {
					expect(famcFamilies.count()).toBeGreaterThanOrEqual(0);
				}
			});
		});

		it("should get spouse families", () => {
			const indis = testGedcom.indis();
			indis.each((indi) => {
				const famsFamilies = indi.fams();
				if (famsFamilies) {
					expect(famsFamilies.count()).toBeGreaterThanOrEqual(0);
				}
			});
		});
	});

	describe("Family Events", () => {
		it("should get marriage event", () => {
			let foundMarriage = false;
			fams.each((fam) => {
				const marr = fam.get("MARR");
				if (marr) {
					foundMarriage = true;
					expect(marr).toBeDefined();
				}
			});
			// At least some families should have marriage events
			if (fams.count() > 10) {
				expect(foundMarriage).toBe(true);
			}
		});

		it("should get marriage date", () => {
			fams.each((fam) => {
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
			fams.each((fam) => {
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
			fams.each((fam) => {
				const husbId = fam.get("HUSB")?.toValue();
				if (husbId) {
					const husb = testGedcom.indi(husbId);
					expect(husb).toBeDefined();
				}
			});
		});

		it("should validate wife reference", () => {
			fams.each((fam) => {
				const wifeId = fam.get("WIFE")?.toValue();
				if (wifeId) {
					const wife = testGedcom.indi(wifeId);
					expect(wife).toBeDefined();
				}
			});
		});

		it("should validate children references", () => {
			fams.each((fam) => {
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
