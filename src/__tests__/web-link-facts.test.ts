import { describe, expect, it } from "vitest";

import GedcomTree from "@treeviz/gedcom-parser";

describe("getFacts web links", () => {
	it("exposes WWW payload and _WLNK title/note for the facts list", () => {
		const { gedcom } = GedcomTree.parse(`0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Peter /Toth/
1 WWW https://www.familysearch.org/tree/person/GSLZ-V6W
1 _WLNK
2 TITL Halotti anyakonyvi kivonat
2 NOTE https://example.com/death
0 TRLR`);
		const indi = gedcom?.indi("@I1@");
		const facts = indi?.getFacts();
		const tags: string[] = [];
		facts?.forEach((fact) => {
			if (fact.type) {
				tags.push(String(fact.type));
			}
		});
		expect(tags).toEqual(expect.arrayContaining(["WWW", "_WLNK"]));
		expect(indi?.get("WWW")?.toValue()).toContain("familysearch.org");
		expect(indi?.get("_WLNK")?.get("TITL")?.toValue()).toBe(
			"Halotti anyakonyvi kivonat"
		);
		expect(indi?.get("_WLNK")?.get("NOTE")?.toValue()).toBe(
			"https://example.com/death"
		);
	});
});
