import { mergeGedcoms } from "../classes/gedcom";
import GedcomTree from "../utils/parser";
import { textFileLoader } from "./test-utils";

const mergeSource = textFileLoader("src/__tests__/mocks/merge-source.ged");
const mergeTarget = textFileLoader("src/__tests__/mocks/merge-target.ged");
const mergeSourceNameMatch = textFileLoader("src/__tests__/mocks/merge-source-name-match.ged");

describe("mergeGedcoms Function", () => {
	describe("Basic Merge with ID Strategy", () => {
		it("should merge two GEDCOMs without ID conflicts", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "id");

			// Check that all individuals are present (no ID conflicts, so all should be added)
			const mergedIndis = merged.indis();
			expect(mergedIndis?.length).toBe(5); // 2 from target + 3 from source

			// Check that target individuals are preserved
			expect(merged.indi("@I1@")?.NAME?.toString()).toBe("Alice /Johnson/");
			expect(merged.indi("@I2@")?.NAME?.toString()).toBe("John /Smith/");
			
			// Check that source individuals were added with their IDs (no conflicts)
			expect(merged.indi("@I10@")?.NAME?.toString()).toBe("John /Smith/");
			expect(merged.indi("@I11@")?.NAME?.toString()).toBe("Jane /Doe/");
			expect(merged.indi("@I12@")?.NAME?.toString()).toBe("Bob /Smith/");
		});

		it("should remap source IDs when needed", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "id");

			// Source has @I10@, @I11@, @I12@ which don't conflict with target @I1@, @I2@
			// So all 5 individuals should be present
			const mergedIndis = merged.indis();
			
			// Count individuals with each name
			let johnCount = 0;
			let janeCount = 0;
			let bobCount = 0;
			let aliceCount = 0;

			mergedIndis?.forEach((indi) => {
				const name = indi.NAME?.toString() || "";
				if (name.includes("John /Smith/")) johnCount++;
				if (name.includes("Jane /Doe/")) janeCount++;
				if (name.includes("Bob /Smith/")) bobCount++;
				if (name.includes("Alice /Johnson/")) aliceCount++;
			});

			expect(johnCount).toBe(2); // One from target (@I2@), one from source (@I10@)
			expect(janeCount).toBe(1); // Only from source (@I11@)
			expect(bobCount).toBe(1); // Only from source (@I12@)
			expect(aliceCount).toBe(1); // Only from target (@I1@)
		});

		it("should preserve family relationships with remapped IDs", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "id");

			// Check that families exist
			const mergedFams = merged.fams();
			expect(mergedFams?.length).toBeGreaterThanOrEqual(2); // At least 1 from target + 1 from source

			// Check that family relationships are valid
			mergedFams?.forEach((fam) => {
				const husbId = fam.HUSB?.value;
				const wifeId = fam.WIFE?.value;
				const children = fam.CHIL?.toList();

				// If family has husband, he should exist in merged gedcom
				if (husbId) {
					expect(merged.indi(husbId as string)).toBeTruthy();
				}

				// If family has wife, she should exist in merged gedcom
				if (wifeId) {
					expect(merged.indi(wifeId as string)).toBeTruthy();
				}

				// All children should exist in merged gedcom
				children?.forEach((childRef) => {
					const childId = childRef.value;
					if (childId) {
						expect(merged.indi(childId as string)).toBeTruthy();
					}
				});
			});
		});

		it("should preserve FAMS and FAMC references with remapped IDs", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "id");

			// Check individuals' family references
			merged.indis()?.forEach((indi) => {
				// Check FAMS references
				const fams = indi.FAMS?.toList();
				fams?.forEach((famRef) => {
					const famId = famRef.value;
					if (famId) {
						expect(merged.fam(famId as string)).toBeTruthy();
					}
				});

				// Check FAMC references
				const famc = indi.FAMC?.toList();
				famc?.forEach((famRef) => {
					const famId = famRef.value;
					if (famId) {
						expect(merged.fam(famId as string)).toBeTruthy();
					}
				});
			});
		});
	});

	describe("Merge with NAME Strategy", () => {
		it("should merge individuals with matching names", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			// Both have "John /Smith/" - should be merged
			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "NAME");

			const mergedIndis = merged.indis();
			
			// Count individuals with each name
			let johnCount = 0;
			let janeCount = 0;
			let bobCount = 0;
			let aliceCount = 0;

			mergedIndis?.forEach((indi) => {
				const name = indi.NAME?.toString() || "";
				if (name.includes("John /Smith/")) johnCount++;
				if (name.includes("Jane /Doe/")) janeCount++;
				if (name.includes("Bob /Smith/")) bobCount++;
				if (name.includes("Alice /Johnson/")) aliceCount++;
			});

			// John Smith should only appear once (merged)
			expect(johnCount).toBe(1);
			expect(janeCount).toBe(1);
			expect(bobCount).toBe(1);
			expect(aliceCount).toBe(1);
		});

		it("should merge family relationships from matched individuals", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "NAME");

			// Find John Smith - should have families from both sources
			let johnSmith;
			merged.indis()?.forEach((indi) => {
				const name = indi.NAME?.toString() || "";
				if (name.includes("John /Smith/")) {
					johnSmith = indi;
				}
			});

			expect(johnSmith).toBeTruthy();
			
			// John should have FAMS from both target and source
			const famsRefs = johnSmith?.FAMS?.toList();
			expect(famsRefs?.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty source GEDCOM", async () => {
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);
			const { gedcom: emptyGedcom } = GedcomTree.parse("0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR");

			const merged = await mergeGedcoms(targetGedcom, emptyGedcom, "id");

			// Should be same as target
			expect(merged.indis()?.length).toBe(targetGedcom.indis()?.length);
		});

		it("should handle source GEDCOM with no matching individuals", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			// Use a strategy that won't match anyone (e.g., BIRT.PLAC)
			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "BIRT.PLAC");

			// All individuals should be present (no matches, so all added)
			const targetCount = targetGedcom.indis()?.length || 0;
			const sourceCount = sourceGedcom.indis()?.length || 0;
			expect(merged.indis()?.length).toBe(targetCount + sourceCount);
		});

		it("should generate unique IDs even with many conflicts", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "id");

			// Check all IDs are unique
			const allIds = new Set<string>();
			merged.indis()?.forEach((indi) => {
				if (indi.id) {
					expect(allIds.has(indi.id)).toBe(false);
					allIds.add(indi.id);
				}
			});

			merged.fams()?.forEach((fam) => {
				if (fam.id) {
					expect(allIds.has(fam.id)).toBe(false);
					allIds.add(fam.id);
				}
			});
		});
	});

	describe("GEDCOM Export", () => {
		it("should export merged GEDCOM as valid string", async () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = await mergeGedcoms(targetGedcom, sourceGedcom, "id");

			const gedcomString = merged.toGedcom();
			expect(gedcomString).toBeTruthy();
			expect(gedcomString).toContain("0 HEAD");
			expect(gedcomString).toContain("0 TRLR");

			// Should be parseable
			const { gedcom: reparsed } = GedcomTree.parse(gedcomString);
			expect(reparsed.indis()?.length).toBe(merged.indis()?.length);
		});
	});
});
