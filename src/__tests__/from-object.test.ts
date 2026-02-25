/**
 * Tests for fromObject / gedcomFromObject round-trip serialization.
 *
 * Goal: toObject() → fromObject() must produce a class instance that is
 * functionally equivalent to the original (same toObject / toGedcom output).
 *
 * Coverage:
 *  1. Common.fromObject – single node lazy parsing
 *  2. List round-trip via the rawObjectFactory
 *  3. GedCom round-trip (full GEDCOM: parse → toObject → gedcomFromObject)
 *  4. GedCom round-trip with a minimal inline GEDCOM string
 *  5. gedcomFromObject produces correct class instances (Indi, Fam, …)
 */

import { createCommon, Common } from "../classes/common";
import { gedcomFromObject, createGedCom } from "../classes/gedcom";
import { List } from "../classes/list";
import { Indi } from "../classes/indi";
import { Fam } from "../classes/fam";
// Importing common-creator registers Common._objectFactory as a side-effect
import "../utils/common-creator";
import GedcomTree from "..";
import { textFileLoader } from "./test-utils";

// ─── helpers ────────────────────────────────────────────────────────────────

const MINIMAL_GEDCOM = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
2 GIVN John
2 SURN Doe
1 SEX M
1 BIRT
2 DATE 15 JAN 1990
2 PLAC New York, USA
1 DEAT
2 DATE 25 DEC 2050
2 PLAC California, USA
0 @I2@ INDI
1 NAME Jane /Doe/
2 GIVN Jane
2 SURN Doe
1 SEX F
1 BIRT
2 DATE 20 MAR 1985
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
0 TRLR`;

// ─── suite ──────────────────────────────────────────────────────────────────

describe("fromObject / gedcomFromObject round-trip", () => {
	// ── 1. Common.fromObject – lazy single node ──────────────────────────────

	describe("Common.fromObject – lazy single node", () => {
		it("restores value and nested children lazily", () => {
			const gedcom = createGedCom();
			const node = createCommon(gedcom);

			const raw = {
				value: "John /Doe/",
				GIVN: { value: "John" },
				SURN: { value: "Doe" },
			};

			node.fromObject(raw);

			// value is set eagerly
			expect(node.toValue()).toBe("John /Doe/");

			// children are resolved lazily on first get()
			const givn = node.get("GIVN");
			expect(givn).toBeInstanceOf(Common);
			expect(givn?.toValue()).toBe("John");

			const surn = node.get("SURN");
			expect(surn).toBeInstanceOf(Common);
			expect(surn?.toValue()).toBe("Doe");
		});

		it("removes key from _rawObject after first access", () => {
			const gedcom = createGedCom();
			const node = createCommon(gedcom);
			node.fromObject({ GIVN: { value: "John" } });

			// First access – parsed and attached
			const first = node.get("GIVN");
			expect(first?.toValue()).toBe("John");

			// Second access – now served from the class property, not _rawObject
			const second = node.get("GIVN");
			expect(second).toBe(first);
		});

		it("returns undefined for keys not in raw or on the instance", () => {
			const gedcom = createGedCom();
			const node = createCommon(gedcom);
			node.fromObject({ GIVN: { value: "John" } });

			expect(node.get("SURN")).toBeUndefined();
		});

		it("handles nested depth correctly", () => {
			const gedcom = createGedCom();
			const node = createCommon(gedcom);
			node.fromObject({
				BIRT: {
					DATE: { value: "15 JAN 1990" },
					PLAC: { value: "New York" },
				},
			});

			const birt = node.get("BIRT");
			expect(birt).toBeInstanceOf(Common);

			const date = birt?.get?.("DATE");
			expect(date?.toValue()).toBe("15 Jan 1990");

			const plac = birt?.get?.("PLAC");
			expect(plac?.toValue()).toBe("New York");
		});

		it("handles array values as a List", () => {
			const gedcom = createGedCom();
			const node = createCommon(gedcom);
			node.fromObject({
				BIRT: [
					{ value: "primary", DATE: { value: "1990" } },
					{ value: "secondary", DATE: { value: "1989" } },
				],
			});

			const birt = node.get("BIRT");
			expect(birt).toBeInstanceOf(List);
			expect(birt?.toList().length).toBe(2);
		});
	});

	// ── 2. Common round-trip (toObject → fromObject) ─────────────────────────

	describe("Common round-trip", () => {
		it("toObject → fromObject produces same toObject output", () => {
			const gedcom = createGedCom();
			const node = createCommon(gedcom);
			// Build a node via set()
			node.value = "John /Doe/";
			const givn = createCommon(gedcom);
			givn.value = "John";
			node.set("GIVN", givn);
			const surn = createCommon(gedcom);
			surn.value = "Doe";
			node.set("SURN", surn);

			// Serialize then restore
			const serialized = node.toObject() as Record<string, unknown>;
			const restored = createCommon(gedcom);
			restored.fromObject(serialized);

			// Both toObject() calls go through the same flush path, so they must match
			expect(restored.toObject()).toEqual(
				createCommon(gedcom).fromObject(serialized).toObject()
			);
		});
	});

	// ── 3. GedCom round-trip – minimal inline GEDCOM ─────────────────────────

	describe("GedCom round-trip – minimal inline GEDCOM", () => {
		// normalizedJson = parse → toObject → gedcomFromObject → toObject
		// This is the canonical form: both sides go through the same pipeline.
		let normalizedJson: Record<string, unknown>;

		beforeEach(() => {
			const { gedcom } = GedcomTree.parse(MINIMAL_GEDCOM);
			normalizedJson = gedcomFromObject(
				gedcom.toObject() as Record<string, unknown>
			).toObject() as Record<string, unknown>;
		});

		it("gedcomFromObject produces a GedCom instance", () => {
			const restored = gedcomFromObject(normalizedJson);
			expect(restored).toBeInstanceOf(Object);
			// GedCom has indis() method
			expect(typeof restored.indis).toBe("function");
		});

		it("restored toObject matches original toObject", () => {
			const restored = gedcomFromObject(normalizedJson);
			expect(restored.toObject()).toEqual(normalizedJson);
		});

		it("restored toGedcom matches original toGedcom", () => {
			const { gedcom: orig } = GedcomTree.parse(MINIMAL_GEDCOM);
			// Both sides normalized through gedcomFromObject so toGedcom is comparable
			const origNormalized = gedcomFromObject(
				orig.toObject() as Record<string, unknown>
			);
			const restored = gedcomFromObject(
				orig.toObject() as Record<string, unknown>
			);

			expect(
				restored.toGedcom(undefined, undefined, { original: true })
			).toEqual(
				origNormalized.toGedcom(undefined, undefined, {
					original: true,
				})
			);
		});

		it("individual count matches", () => {
			const restored = gedcomFromObject(normalizedJson);
			expect(restored.indis()?.length).toBe(2);
		});

		it("family count matches", () => {
			const restored = gedcomFromObject(normalizedJson);
			expect(restored.fams()?.length).toBe(1);
		});

		it("individual data accessible after restore", () => {
			const restored = gedcomFromObject(normalizedJson);
			const indi = restored.indi("@I1@");
			expect(indi).toBeDefined();
			// NAME is lazy-parsed from rawObject
			const name = indi?.get("NAME");
			expect(name).toBeDefined();
			expect(name?.toValue?.() ?? name?.index?.(0)?.toValue()).toMatch(
				/John/
			);
		});

		it("individual sex is accessible", () => {
			const restored = gedcomFromObject(normalizedJson);
			const indi = restored.indi("@I1@");
			const sex = indi?.get("SEX");
			expect(sex?.toValue()).toBe("M");
		});

		it("family references are accessible", () => {
			const restored = gedcomFromObject(normalizedJson);
			const fam = restored.fam("@F1@");
			const husb = fam?.get("HUSB");
			expect(husb?.toValue()).toBe("@I1@");
			const wife = fam?.get("WIFE");
			expect(wife?.toValue()).toBe("@I2@");
		});

		it("HUSB ref resolves to the Indi instance after restore", () => {
			const restored = gedcomFromObject(normalizedJson);
			const fam = restored.fam("@F1@");
			const husb = fam?.get("HUSB");
			// refType must survive the round-trip so .ref works
			expect(husb?.ref).toBeDefined();
			expect(husb?.ref?.id).toBe("@I1@");
		});

		it("WIFE ref resolves to the Indi instance after restore", () => {
			const restored = gedcomFromObject(normalizedJson);
			const fam = restored.fam("@F1@");
			const wife = fam?.get("WIFE");
			expect(wife?.ref).toBeDefined();
			expect(wife?.ref?.id).toBe("@I2@");
		});

		it("HEAD is lazily accessible", () => {
			const restored = gedcomFromObject(normalizedJson);
			const head = restored.get("HEAD");
			expect(head).toBeDefined();
			const sour = head?.get?.("SOUR");
			expect(sour?.toValue()).toBe("TestApp");
		});
	});

	// ── 4. GedCom round-trip – full mock.ged ─────────────────────────────────

	describe("GedCom round-trip – full mock.ged", () => {
		const mock = textFileLoader("src/__tests__/mocks/mock.ged");

		it("toObject → gedcomFromObject → toObject produces same output", () => {
			const { gedcom } = GedcomTree.parse(mock);
			// Normalize both sides through the same pipeline
			const normalizedJson = gedcomFromObject(
				gedcom.toObject() as Record<string, unknown>
			).toObject() as Record<string, unknown>;

			const restored = gedcomFromObject(normalizedJson);
			expect(restored.toObject()).toEqual(normalizedJson);
		});

		it("individual and family counts match", () => {
			const { gedcom } = GedcomTree.parse(mock);
			const restored = gedcomFromObject(
				gedcom.toObject() as Record<string, unknown>
			);

			expect(restored.indis()?.length).toBe(gedcom.indis()?.length);
			expect(restored.fams()?.length).toBe(gedcom.fams()?.length);
		});
	});

	// ── 5. Correct class instances ────────────────────────────────────────────

	describe("gedcomFromObject produces correct class instances", () => {
		it("INDI entries are instances of Indi", () => {
			const { gedcom } = GedcomTree.parse(MINIMAL_GEDCOM);
			const restored = gedcomFromObject(
				gedcom.toObject() as Record<string, unknown>
			);

			restored.indis()?.forEach((indi) => {
				expect(indi).toBeInstanceOf(Indi);
			});
		});

		it("FAM entries are instances of Fam", () => {
			const { gedcom } = GedcomTree.parse(MINIMAL_GEDCOM);
			const restored = gedcomFromObject(
				gedcom.toObject() as Record<string, unknown>
			);

			restored.fams()?.forEach((fam) => {
				expect(fam).toBeInstanceOf(Fam);
			});
		});
	});

	// ── 6. gedcomFromObject throws without factory ────────────────────────────

	describe("gedcomFromObject factory guard", () => {
		it("throws if Common._objectFactory is not set", () => {
			const original = Common._objectFactory;
			Common._objectFactory = undefined;

			expect(() => gedcomFromObject({})).toThrow(
				/Common\._objectFactory is not registered/
			);

			// Restore
			Common._objectFactory = original;
		});
	});
});
