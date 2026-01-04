import { describe, it, expect } from "vitest";
import { setNestedGroup } from "../utils/nested-group";
import { Individuals, Indi, GedCom } from "../classes";
import type { NestedGroup } from "../types/types";

describe("Nested Group Organization Utility", () => {
	it("should calculate correct length when same item appears in multiple subgroups", () => {
		// Create a mock GedCom instance
		const gedcom = new GedCom("");

		// Create test individuals
		const indi1 = new Indi(gedcom, "@I1@" as any);
		const indi2 = new Indi(gedcom, "@I2@" as any);
		const indi3 = new Indi(gedcom, "@I3@" as any);

		// Create Individuals collections
		const subGroup1 = new Individuals();
		subGroup1.item("@I1@" as any, indi1 as any);
		subGroup1.item("@I2@" as any, indi2 as any);

		const subGroup2 = new Individuals();
		subGroup2.item("@I1@" as any, indi1 as any); // Same as in subGroup1
		subGroup2.item("@I3@" as any, indi3 as any);

		// Build nested group
		const nestedGroup: NestedGroup = {};
		setNestedGroup(nestedGroup, ["Group1", "SubGroup1"], subGroup1);
		setNestedGroup(nestedGroup, ["Group1", "SubGroup2"], subGroup2);

		// Verify SubGroup1 has length 2
		expect(nestedGroup.Group1?.SubGroup1?.length).toBe(2);

		// Verify SubGroup2 has length 2
		expect(nestedGroup.Group1?.SubGroup2?.length).toBe(2);

		// Verify Group1 has length 3 (not 4) because Item1 is in both subgroups
		expect(nestedGroup.Group1?.length).toBe(3);

		// Verify Group1 does NOT have items (not a leaf level)
		// Items should only be at the leaf level (SubGroup1 and SubGroup2)
		expect(nestedGroup.Group1?.items).toBeUndefined();
	});

	it("should calculate correct length when no items are duplicated", () => {
		const gedcom = new GedCom("");

		const indi1 = new Indi(gedcom, "@I1@" as any);
		const indi2 = new Indi(gedcom, "@I2@" as any);
		const indi3 = new Indi(gedcom, "@I3@" as any);
		const indi4 = new Indi(gedcom, "@I4@" as any);

		const subGroup1 = new Individuals();
		subGroup1.item("@I1@" as any, indi1 as any);
		subGroup1.item("@I2@" as any, indi2 as any);

		const subGroup2 = new Individuals();
		subGroup2.item("@I3@" as any, indi3 as any);
		subGroup2.item("@I4@" as any, indi4 as any);

		const nestedGroup: NestedGroup = {};
		setNestedGroup(nestedGroup, ["Group1", "SubGroup1"], subGroup1);
		setNestedGroup(nestedGroup, ["Group1", "SubGroup2"], subGroup2);

		expect(nestedGroup.Group1?.SubGroup1?.length).toBe(2);
		expect(nestedGroup.Group1?.SubGroup2?.length).toBe(2);
		expect(nestedGroup.Group1?.length).toBe(4); // All unique
		// Group1 should NOT have items (not a leaf)
		expect(nestedGroup.Group1?.items).toBeUndefined();
	});

	it("should handle multi-level nesting correctly", () => {
		const gedcom = new GedCom("");

		const indi1 = new Indi(gedcom, "@I1@" as any);
		const indi2 = new Indi(gedcom, "@I2@" as any);
		const indi3 = new Indi(gedcom, "@I3@" as any);

		const items1 = new Individuals();
		items1.item("@I1@" as any, indi1 as any);
		items1.item("@I2@" as any, indi2 as any);

		const items2 = new Individuals();
		items2.item("@I1@" as any, indi1 as any);
		items2.item("@I3@" as any, indi3 as any);

		const items3 = new Individuals();
		items3.item("@I2@" as any, indi2 as any);
		items3.item("@I3@" as any, indi3 as any);

		const nestedGroup: NestedGroup = {};
		setNestedGroup(nestedGroup, ["Country1", "City1", "Street1"], items1);
		setNestedGroup(nestedGroup, ["Country1", "City1", "Street2"], items2);
		setNestedGroup(nestedGroup, ["Country1", "City2", "Street3"], items3);

		// Street level should be correct
		expect(nestedGroup.Country1?.City1?.Street1?.length).toBe(2);
		expect(nestedGroup.Country1?.City1?.Street2?.length).toBe(2);
		expect(nestedGroup.Country1?.City2?.Street3?.length).toBe(2);

		// City1 should have 3 unique items (I1, I2, I3)
		expect(nestedGroup.Country1?.City1?.length).toBe(3);

		// City2 should have 2 unique items (I2, I3)
		expect(nestedGroup.Country1?.City2?.length).toBe(2);

		// Country1 should have 3 unique items (I1, I2, I3)
		expect(nestedGroup.Country1?.length).toBe(3);

		// Parent levels should NOT have items (only leaf levels should)
		expect(nestedGroup.Country1?.items).toBeUndefined();
		expect(nestedGroup.Country1?.City1?.items).toBeUndefined();
		expect(nestedGroup.Country1?.City2?.items).toBeUndefined();

		// Only the leaf levels (streets) should have items
		expect(nestedGroup.Country1?.City1?.Street1?.items?.length).toBe(2);
		expect(nestedGroup.Country1?.City1?.Street2?.items?.length).toBe(2);
		expect(nestedGroup.Country1?.City2?.Street3?.items?.length).toBe(2);
	});

	it("should handle paths where a node is both a leaf and a parent", () => {
		const gedcom = new GedCom("");

		const indi1 = new Indi(gedcom, "@I1@" as any);
		const indi2 = new Indi(gedcom, "@I2@" as any);

		const nestedGroup: NestedGroup = {};
		// Path 1: Group1->SubGroup1 (SubGroup1 is a leaf here)
		setNestedGroup(
			nestedGroup,
			["Group1", "SubGroup1"],
			new Individuals().concat({ "@I1@": indi1 as any })
		);

		// Path 2: Group1->SubGroup1->SubSubGroup1 (SubGroup1 is a parent here)
		setNestedGroup(
			nestedGroup,
			["Group1", "SubGroup1", "SubSubGroup1"],
			new Individuals().concat({ "@I2@": indi2 as any })
		);

		// SubGroup1 should have items from path 1 (it's a leaf there)
		expect(nestedGroup.Group1?.SubGroup1?.items?.length).toBe(1);
		expect(nestedGroup.Group1?.SubGroup1?.items?.has("@I1@" as any)).toBe(
			true
		);

		// SubSubGroup1 should have items from path 2 (it's a leaf there)
		expect(nestedGroup.Group1?.SubGroup1?.SubSubGroup1?.items?.length).toBe(
			1
		);
		expect(
			nestedGroup.Group1?.SubGroup1?.SubSubGroup1?.items?.has(
				"@I2@" as any
			)
		).toBe(true);

		// SubGroup1 should have correct length (2 unique items total: I1 from itself, I2 from SubSubGroup1)
		expect(nestedGroup.Group1?.SubGroup1?.length).toBe(2);

		// Group1 should have correct length (2 unique items)
		expect(nestedGroup.Group1?.length).toBe(2);
	});
});
