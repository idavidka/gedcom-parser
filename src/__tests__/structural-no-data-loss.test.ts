/**
 * Strict parity: `GedcomTree.parse(ged)` and
 * `hydrateFromContent(serializeStructural(parse(ged)))` must be equivalent.
 *
 * Asserts full `toObject({ persist: true })` and `toGedcom({ original: true })`
 * equality — no fingerprint skips.
 */

import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { describe, expect, it } from "vitest";

import GedcomTree from "../utils/parser";
import {
	STRUCTURAL_FORMAT,
	STRUCTURAL_VERSION,
	fromObject,
	hydrateFromContent,
	isStructuralEnvelope,
	parseStructuralEnvelope,
	serializeStructural,
} from "../utils/structural";
import { textFileLoader } from "./test-utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mocksDir = join(__dirname, "mocks");

/** Source fixtures from feat/editor-era mocks (not export snapshots). */
const MOCK_GED_FILES = readdirSync(mocksDir)
	.filter(
		(name) =>
			name.endsWith(".ged") &&
			!name.startsWith("export-") &&
			name !== "mock-export-gedcom.ged"
	)
	.sort();

type Gedcom = NonNullable<ReturnType<typeof GedcomTree.parse>["gedcom"]>;

const persistObject = (gedcom: Gedcom) =>
	gedcom.toObject(undefined, { persist: true });

const toGedcomOriginal = (gedcom: Gedcom) =>
	gedcom.toGedcom(undefined, undefined, { original: true });

const roundTrip = (gedcom: Gedcom) =>
	hydrateFromContent(serializeStructural(gedcom));

describe("structural ↔ parse() full parity (no skips)", () => {
	it.each(MOCK_GED_FILES)(
		"toObject(persist) identical after structural round-trip: %s",
		(fileName) => {
			const raw = textFileLoader(`src/__tests__/mocks/${fileName}`);
			const { gedcom } = GedcomTree.parse(raw);
			expect(gedcom).toBeTruthy();
			const restored = roundTrip(gedcom!);
			expect(persistObject(restored)).toEqual(persistObject(gedcom!));
		},
		30_000
	);

	it.each(MOCK_GED_FILES)(
		"toGedcom(original) identical after structural round-trip: %s",
		(fileName) => {
			const raw = textFileLoader(`src/__tests__/mocks/${fileName}`);
			const { gedcom } = GedcomTree.parse(raw);
			const restored = roundTrip(gedcom!);
			expect(toGedcomOriginal(restored)).toEqual(
				toGedcomOriginal(gedcom!)
			);
		},
		30_000
	);

	it(
		"second structural round-trip stays identical (mock.ged)",
		() => {
			const raw = textFileLoader("src/__tests__/mocks/mock.ged");
			const { gedcom } = GedcomTree.parse(raw);
			const once = roundTrip(gedcom!);
			const twice = roundTrip(once);
			expect(persistObject(twice)).toEqual(persistObject(once));
			expect(toGedcomOriginal(twice)).toEqual(toGedcomOriginal(once));
		},
		60_000
	);

	it("envelope metadata is stable", () => {
		const raw = textFileLoader("src/__tests__/mocks/indi-and-refs.ged");
		const { gedcom } = GedcomTree.parse(raw);
		const payload = serializeStructural(gedcom!);
		expect(isStructuralEnvelope(payload)).toBe(true);
		const envelope = parseStructuralEnvelope(payload);
		expect(envelope?.format).toBe(STRUCTURAL_FORMAT);
		expect(envelope?.v).toBe(STRUCTURAL_VERSION);
	});

	it("custom CONTACT / OCCUPATION survive with identical export order", () => {
		const raw = textFileLoader("src/__tests__/mocks/indi-and-refs.ged");
		const { gedcom } = GedcomTree.parse(raw);
		const restored = fromObject(
			parseStructuralEnvelope(serializeStructural(gedcom!))!.data
		);
		expect(toGedcomOriginal(restored)).toEqual(toGedcomOriginal(gedcom!));
		expect(toGedcomOriginal(restored)).toContain(
			"0 @contact00014@ CONTACT"
		);
		expect(toGedcomOriginal(restored)).toContain(
			"0 @occu00012@ OCCUPATION"
		);
	});

	it(
		"classic GEDCOM hydrate then structural matches parse (dual-read)",
		() => {
			const raw = textFileLoader("src/__tests__/mocks/mock.ged");
			const fromParse = GedcomTree.parse(raw).gedcom!;
			const fromHydrate = hydrateFromContent(raw);
			expect(persistObject(fromHydrate)).toEqual(
				persistObject(fromParse)
			);
			expect(persistObject(roundTrip(fromHydrate))).toEqual(
				persistObject(fromParse)
			);
		},
		60_000
	);

	it("live edit then structural persist matches in-memory tree", () => {
		const { gedcom } = GedcomTree.parse(
			"0 HEAD\n0 @I1@ INDI\n1 NAME Test /One/\n1 SEX M\n0 TRLR"
		);
		gedcom.indi("@I1@")?.set("NAME", "Edited /Person/");
		const restored = roundTrip(gedcom);
		expect(persistObject(restored)).toEqual(persistObject(gedcom));
		expect(toGedcomOriginal(restored)).toEqual(toGedcomOriginal(gedcom));
	});
});
