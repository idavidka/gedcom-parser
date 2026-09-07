import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { describe, expect, it } from "vitest";

import GedcomTree from "../utils/parser";
import {
	fromObject,
	hydrateFromContent,
	serializeStructural,
	parseStructuralEnvelope,
} from "../utils/structural";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockGed = readFileSync(
	join(__dirname, "mocks/indi-and-refs.ged"),
	"utf8"
);

describe("structural persistence", () => {
	it("round-trips INDI count and names via serializeStructural → fromObject", () => {
		const { gedcom } = GedcomTree.parse(mockGed);
		expect(gedcom).toBeTruthy();

		const payload = serializeStructural(gedcom!);
		const envelope = parseStructuralEnvelope(payload);
		expect(envelope?.format).toBe("treeviz-structural");

		const restored = fromObject(envelope!.data);
		expect(restored.indis()?.length).toBe(gedcom!.indis()?.length);

		const originalIds =
			gedcom!
				.indis()
				?.keys()
				?.map((k) => k) ?? [];
		for (const id of originalIds) {
			const a = gedcom!.indi(id);
			const b = restored.indi(id);
			expect(b).toBeTruthy();
			expect(b?.getName?.()?.toValue?.() || b?.toValue?.()).toEqual(
				a?.getName?.()?.toValue?.() || a?.toValue?.()
			);
		}
	});

	it("round-trips custom top-level records (CONTACT / OCCUPATION)", () => {
		const { gedcom } = GedcomTree.parse(mockGed);
		const payload = serializeStructural(gedcom!);
		const restored = fromObject(parseStructuralEnvelope(payload)!.data);

		const listLen = (g: typeof gedcom, tag: string) =>
			(
				g as unknown as Record<
					string,
					{ length?: number } | undefined
				>
			)[`@@${tag}`]?.length ?? 0;

		expect(listLen(restored, "CONTACT")).toBe(listLen(gedcom!, "CONTACT"));
		expect(listLen(restored, "OCCUPATION")).toBe(
			listLen(gedcom!, "OCCUPATION")
		);
		expect(listLen(restored, "FAM")).toBe(listLen(gedcom!, "FAM"));

		const id = "@ind02878@";
		expect(
			restored.indi(id)?.get("BIRT")?.get("DATE")?.toValue?.()
		).toEqual(gedcom!.indi(id)?.get("BIRT")?.get("DATE")?.toValue?.());
	});

	it("hydrateFromContent accepts both GEDCOM text and structural JSON", () => {
		const fromGed = hydrateFromContent(mockGed);
		const structural = serializeStructural(fromGed);
		const fromStruct = hydrateFromContent(structural);
		expect(fromStruct.indis()?.length).toBe(fromGed.indis()?.length);
	});
});
