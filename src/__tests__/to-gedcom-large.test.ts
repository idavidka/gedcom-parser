import { describe, expect, it } from "vitest";

import GedcomTree from "..";
import { appendLines } from "../utils/append-lines";

describe("toGedcom large trees", () => {
	it("appendLines handles argument counts that break push(...arr)", () => {
		const huge = Array.from({ length: 150_000 }, (_, i) => `line ${i}`);
		const viaSpread: string[] = [];
		expect(() => {
			viaSpread.push(...huge);
		}).toThrow(RangeError);

		const viaAppend: string[] = [];
		expect(() => {
			appendLines(viaAppend, huge);
		}).not.toThrow();
		expect(viaAppend).toHaveLength(huge.length);
		expect(viaAppend[0]).toBe("line 0");
		expect(viaAppend.at(-1)).toBe("line 149999");
	});

	it("exports tens of thousands of individuals without stack overflow", () => {
		// ~3 lines per person → >130k lines, past typical push(...arr) limits.
		const personCount = 50_000;
		const lines = ["0 HEAD", "1 CHAR UTF-8"];
		for (let i = 1; i <= personCount; i++) {
			lines.push(`0 @I${i}@ INDI`, `1 NAME P${i} /Test/`, `1 SEX M`);
		}
		lines.push("0 TRLR");

		const { gedcom } = GedcomTree.parse(lines.join("\n"));
		const exported = gedcom.toGedcom(undefined, 0, { original: true });
		expect(exported).toContain("0 @I1@ INDI");
		expect(exported).toContain(`0 @I${personCount}@ INDI`);
		expect(exported.trimEnd().endsWith("0 TRLR")).toBe(true);
		expect(exported.split("\n").length).toBeGreaterThan(130_000);
	});
});
