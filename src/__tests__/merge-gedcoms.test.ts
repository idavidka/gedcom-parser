import { mergeGedcoms } from "../classes/gedcom";
import GedcomTree from "../utils/parser";
import { textFileLoader } from "./test-utils";
import type { MultiTag } from "../types/types";

const mergeSource = textFileLoader("src/__tests__/mocks/merge-source.ged");
const mergeTarget = textFileLoader("src/__tests__/mocks/merge-target.ged");
const mergeSourceNameMatch = textFileLoader("src/__tests__/mocks/merge-source-name-match.ged");
const mergeFsidComplexSource = textFileLoader("src/__tests__/mocks/merge-fsid-complex-source.ged");
const mergeFsidComplexTarget = textFileLoader("src/__tests__/mocks/merge-fsid-complex-target.ged");

describe("mergeGedcoms Function", () => {
	describe("Basic Merge with ID Strategy", () => {
		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");

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

		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");

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

		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");

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

		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");

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
		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			// Both have "John /Smith/" at different IDs - should be merged
			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "NAME");

			const mergedIndis = merged.indis();
			
			// Should have 4 individuals, not 5, because John Smith was merged
			expect(mergedIndis?.length).toBe(4);
			
			// Verify we can still access individuals
			expect(merged.indi("@I1@")).toBeTruthy(); // Alice
			expect(merged.indi("@I11@")).toBeTruthy(); // Jane
			expect(merged.indi("@I12@")).toBeTruthy(); // Bob
		});

		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "NAME");

			// Verify merge happened by checking count
			expect(merged.indis()?.length).toBe(4); // 5 total minus 1 merged
			
			// Verify families were preserved
			expect(merged.fams()?.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Edge Cases", () => {
		it("should.*", () => {
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);
			const { gedcom: emptyGedcom } = GedcomTree.parse("0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR");

			const merged = mergeGedcoms(targetGedcom, emptyGedcom, "id");

			// Should be same as target
			expect(merged.indis()?.length).toBe(targetGedcom.indis()?.length);
		});

		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			// Capture counts before merge
			const targetCount = targetGedcom.indis()?.length || 0;
			const sourceCount = sourceGedcom.indis()?.length || 0;

			// Use a strategy that won't match anyone - OCCU (occupation) doesn't exist in test files
			// Type assertion is needed because OCCU is a valid GEDCOM tag but not in our test data
			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "OCCU" as MultiTag);

			// All individuals should be present (no matches, so all added)
			expect(merged.indis()?.length).toBe(targetCount + sourceCount);
		});

		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");

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
		it("should.*", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeTarget);

			const merged = mergeGedcoms(targetGedcom, sourceGedcom, "id");

			const gedcomString = merged.toGedcom();
			expect(gedcomString).toBeTruthy();
			expect(gedcomString).toContain("0 HEAD");
			expect(gedcomString).toContain("0 TRLR");

			// Should be parseable
			const { gedcom: reparsed } = GedcomTree.parse(gedcomString);
			expect(reparsed.indis()?.length).toBe(merged.indis()?.length);
		});
	});

	describe("Complex _FS_ID Merge (Real-world scenario)", () => {
		it("should merge complex family trees without duplicating FAMC and FAMS", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeFsidComplexSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeFsidComplexTarget);

			// Merge using _FS_ID as strategy
			const merged = mergeGedcoms(sourceGedcom, targetGedcom, "_FS_ID");

			// Find the merged individual with PERSON-011 (_FS_ID)
			// In source: @I11@ with FAMS=[@F6@], FAMC=[@F16@]
			// In target: @I1@ with FAMS=[@F1@], FAMC=[@F9@]
			// After merge: should have FAMS=[one family], FAMC=[one family]
			const mergedIndi = merged.indi("@I11@");
			expect(mergedIndi).toBeTruthy();

			// CRITICAL: FAMS should not be duplicated (F6 and F1 have same members, so should merge)
			const famsRefs = mergedIndi?.FAMS?.toList();
			expect(famsRefs?.length).toBe(1);
			
			// CRITICAL: FAMC should not be duplicated (F16 and F9 have same child, so should merge)
			const famcRefs = mergedIndi?.FAMC?.toList();
			expect(famcRefs?.length).toBe(1);

			// Verify family references are valid (if they exist)
			if (famsRefs && famsRefs.length > 0) {
				const famsId = famsRefs[0]?.value as string;
				if (famsId) {
					expect(merged.fam(famsId)).toBeTruthy();
				}
			}
			
			if (famcRefs && famcRefs.length > 0) {
				const famcId = famcRefs[0]?.value as string;
				if (famcId) {
					expect(merged.fam(famcId)).toBeTruthy();
				}
			}
		});

		it("should correctly merge individuals with shared _FS_ID", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeFsidComplexSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeFsidComplexTarget);

			const merged = mergeGedcoms(sourceGedcom, targetGedcom, "_FS_ID");

			// Check Margaret Wilson (PERSON-006)
			// In source: @I6@ with FAMC=@F6@, FAMS=@F3@
			// In target: @I14@ with FAMC=@F1@, FAMS=@F7@
			// After merge: should be one individual with one FAMC and one FAMS (families merged)
			const mergedMargaret = merged.indi("@I6@");
			expect(mergedMargaret).toBeTruthy();
			
			// Should have exactly one FAMC (families merged)
			const margaretFamc = mergedMargaret?.FAMC?.toList();
			expect(margaretFamc?.length).toBe(1);

			// Should have exactly one FAMS (families merged)
			const margaretFams = mergedMargaret?.FAMS?.toList();
			expect(margaretFams?.length).toBe(1);
		});

		it("should merge families with same members", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeFsidComplexSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeFsidComplexTarget);

			const merged = mergeGedcoms(sourceGedcom, targetGedcom, "_FS_ID");

			// F6 in source: HUSB=@I11@ (PERSON-011), WIFE=@I12@ (PERSON-012)
			// F1 in target: HUSB=@I1@ (PERSON-011), WIFE=@I2@ (PERSON-012)
			// These should be recognized as the same family and merged

			// Count total families
			const totalFamilies = merged.fams()?.length || 0;
			
			// Original counts: source has 8 families, target has 9 families
			// With proper merging, some should be combined
			expect(totalFamilies).toBeLessThan(17); // Should be less than sum of both
		});

		it("should handle parent families (FAMC) without HUSB/WIFE", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeFsidComplexSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeFsidComplexTarget);

			const merged = mergeGedcoms(sourceGedcom, targetGedcom, "_FS_ID");

			// F16 in source: only WIFE=@I21@ (PERSON-021), CHIL=[@I11@, @I22@]
			// F9 in target: only WIFE=@I3@ (PERSON-021), CHIL=[@I1@]
			// These should be recognized as the same family (same wife after individual matching)

			// Check that PERSON-011 has only one FAMC
			const person011 = merged.indi("@I11@");
			const famcRefs = person011?.FAMC?.toList();
			expect(famcRefs?.length).toBe(1);
		});

		it("should not merge strategy field, keeping it as Common not List", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeFsidComplexSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeFsidComplexTarget);

			const merged = mergeGedcoms(sourceGedcom, targetGedcom, "_FS_ID");

			// When individuals are merged by _FS_ID, the _FS_ID field should NOT be merged
			// because both individuals have the same _FS_ID (that's why they matched)
			// This prevents _FS_ID from becoming a List

			const person011 = merged.indi("@I11@");
			expect(person011?._FS_ID).toBeTruthy();
			
			// _FS_ID should not be a List (it should remain as Common)
			const fsIdValue = person011?._FS_ID;
			expect(fsIdValue).not.toBeInstanceOf(Array);
			
			// Check that it's not a List by verifying toString() works correctly
			const fsIdString = person011?._FS_ID?.toString();
			expect(fsIdString).toBe("PERSON-011");
			expect(fsIdString).not.toContain("[object Object]");
		});

		it("should maintain referential integrity after merge", () => {
			const { gedcom: sourceGedcom } = GedcomTree.parse(mergeFsidComplexSource);
			const { gedcom: targetGedcom } = GedcomTree.parse(mergeFsidComplexTarget);

			const merged = mergeGedcoms(sourceGedcom, targetGedcom, "_FS_ID");

			// Every individual's FAMS should point to valid families
			merged.indis()?.forEach((indi) => {
				const famsRefs = indi.FAMS?.toList();
				famsRefs?.forEach((famRef) => {
					const famId = famRef.value as string;
					const fam = merged.fam(famId);
					expect(fam).toBeTruthy();
				});

				// Every individual's FAMC should point to valid families
				const famcRefs = indi.FAMC?.toList();
				famcRefs?.forEach((famRef) => {
					const famId = famRef.value as string;
					const fam = merged.fam(famId);
					expect(fam).toBeTruthy();
				});
			});

			// Every family's HUSB/WIFE/CHIL should point to valid individuals
			merged.fams()?.forEach((fam) => {
				const husbId = fam.HUSB?.value as string | undefined;
				if (husbId) {
					expect(merged.indi(husbId)).toBeTruthy();
				}

				const wifeId = fam.WIFE?.value as string | undefined;
				if (wifeId) {
					expect(merged.indi(wifeId)).toBeTruthy();
				}

				const children = fam.CHIL?.toList();
				children?.forEach((childRef) => {
					const childId = childRef.value as string;
					expect(merged.indi(childId)).toBeTruthy();
				});
			});
		});
	});

	describe("OBJE / SOUR xref remapping", () => {
		it("does not attach source @O1@ memories to an existing Ancestry @O1@", () => {
			const targetGed = `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Target /Person/
1 _FS_ID GSLZ-V6W
1 OBJE @O1@
0 @O1@ OBJE
1 FILE https://ancestry.example/marriage.jpg
1 TITL Ancestry marriage register
0 TRLR
`;
			const sourceGed = `0 HEAD
1 GEDC
2 VERS 5.5
0 @I1@ INDI
1 NAME FS /Person/
1 _FS_ID GSLZ-V6W
1 OBJE @O1@
1 SOUR @S1@
0 @O1@ OBJE
1 _IS_FS Y
1 _FS_ID MEM-1
1 FILE https://api.familysearch.org/platform/memories/memories/MEM-1
1 TITL FS memory photo
0 @S1@ SOUR
1 _IS_FS Y
1 _FS_ID SRC-1
1 TITL FS source
0 TRLR
`;
			const { gedcom: target } = GedcomTree.parse(targetGed);
			const { gedcom: source } = GedcomTree.parse(sourceGed);
			const merged = mergeGedcoms(target, source, "_FS_ID");

			const person = merged.indi("@I1@");
			const objePointers =
				person
					?.get("OBJE")
					?.toList()
					?.values()
					?.map((ref) => String(ref?.toValue?.() ?? "")) ?? [];

			expect(objePointers).toContain("@O1@");
			expect(objePointers.some((id) => id !== "@O1@")).toBe(true);

			const ancestry = merged.obje("@O1@");
			expect(ancestry?.get("TITL")?.toValue()).toBe(
				"Ancestry marriage register"
			);

			const fsObjeId = objePointers.find((id) => id !== "@O1@");
			expect(fsObjeId).toBeTruthy();
			const fsObje = merged.obje(fsObjeId as `@O${number}@`);
			expect(fsObje?.get("_IS_FS")?.toValue()).toBe("Y");
			expect(fsObje?.get("TITL")?.toValue()).toBe("FS memory photo");

			// Remapped INDI→OBJE pointers must keep refType so FILE resolves
			// through the proxy (gallery / multimedia).
			const fsPointer = person
				?.get("OBJE")
				?.toList()
				?.values()
				?.find((ref) => String(ref?.toValue?.() ?? "") === fsObjeId);
			expect(fsPointer?.refType).toBe("OBJE");
			expect(fsPointer?.get("FILE")?.toValue()).toBe(
				"https://api.familysearch.org/platform/memories/memories/MEM-1"
			);

			const sourPointers =
				person
					?.get("SOUR")
					?.toList()
					?.values()
					?.map((ref) => String(ref?.toValue?.() ?? "")) ?? [];
			expect(sourPointers.length).toBeGreaterThan(0);
			const sour = merged.sour(sourPointers[0] as `@S${number}@`);
			expect(sour?.get("_IS_FS")?.toValue()).toBe("Y");
			const sourPointer = person?.get("SOUR")?.toList()?.values()?.[0];
			expect(sourPointer?.refType).toBe("SOUR");
		});

		it("reuses OBJE / SOUR with the same _FS_ID on re-import (no gallery dupes)", () => {
			const targetGed = `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Target /Person/
1 _FS_ID GSLZ-V6W
1 OBJE @O2@
1 SOUR @S2@
0 @O2@ OBJE
1 _IS_FS Y
1 _FS_ID MEM-1
1 FILE https://example.com/old-memory.jpg
1 TITL FS memory photo
0 @S2@ SOUR
1 _IS_FS Y
1 _FS_ID SRC-1
1 TITL FS source
1 WWW https://www.familysearch.org/ark:/61903/1:1:ABC
1 OBJE @O2@
0 TRLR
`;
			const sourceGed = `0 HEAD
1 GEDC
2 VERS 5.5
0 @I1@ INDI
1 NAME FS /Person/
1 _FS_ID GSLZ-V6W
1 OBJE @O1@
1 SOUR @S1@
0 @O1@ OBJE
1 _IS_FS Y
1 _FS_ID MEM-1
1 FILE https://example.com/new-memory.jpg
1 WWW https://www.familysearch.org/photos/artifacts/MEM-1
1 TITL FS memory photo
0 @S1@ SOUR
1 _IS_FS Y
1 _FS_ID SRC-1
1 TITL FS source again
1 WWW https://www.familysearch.org/ark:/61903/1:1:ABC
1 OBJE @O1@
0 TRLR
`;
			const { gedcom: target } = GedcomTree.parse(targetGed);
			const { gedcom: source } = GedcomTree.parse(sourceGed);
			const merged = mergeGedcoms(target, source, "_FS_ID");

			const person = merged.indi("@I1@");
			const objePointers =
				person
					?.get("OBJE")
					?.toList()
					?.values()
					?.map((ref) => String(ref?.toValue?.() ?? "")) ?? [];
			expect(objePointers).toEqual(["@O2@"]);

			const sourPointers =
				person
					?.get("SOUR")
					?.toList()
					?.values()
					?.map((ref) => String(ref?.toValue?.() ?? "")) ?? [];
			expect(sourPointers).toEqual(["@S2@"]);

			const fsObjes: string[] = [];
			merged.objes()?.forEach((obje, id) => {
				if (obje?.get("_FS_ID")?.toValue() === "MEM-1") {
					fsObjes.push(String(id));
				}
			});
			expect(fsObjes).toEqual(["@O2@"]);

			const fsSours: string[] = [];
			merged.sours()?.forEach((sour, id) => {
				if (sour?.get("_FS_ID")?.toValue() === "SRC-1") {
					fsSours.push(String(id));
				}
			});
			expect(fsSours).toEqual(["@S2@"]);

			// Re-import fills missing WWW on the reused OBJE.
			expect(merged.obje("@O2@")?.get("WWW")?.toValue()).toBe(
				"https://www.familysearch.org/photos/artifacts/MEM-1"
			);
			// Existing FILE kept (already a binary URL).
			expect(merged.obje("@O2@")?.get("FILE")?.toValue()).toBe(
				"https://example.com/old-memory.jpg"
			);
		});
	});
});
