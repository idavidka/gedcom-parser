import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import GedcomTree from "../index";
import { concatenateSources, lexGedcom } from "../store/lex";
import { getStoreLink } from "../store/session";
import { resetSharedMemoryStore } from "../store/memory-store";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixture = (name: string) =>
	readFileSync(resolve(__dirname, "mocks/store", name), "utf8");

/** Preserve a leading UTF-8 BOM as a JS string character. */
const fixtureBinary = (name: string) => {
	const buf = readFileSync(resolve(__dirname, "mocks/store", name));
	if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
		return "\uFEFF" + buf.slice(3).toString("utf8");
	}
	return buf.toString("utf8");
};

describe("GEDCOM store round-trip", () => {
	beforeEach(() => {
		resetSharedMemoryStore();
	});

	const cases = [
		"roundtrip-551.ged",
		"roundtrip-crlf.ged",
		"roundtrip-bom.ged",
		"roundtrip-conc-cont.ged",
		"roundtrip-no-nl.ged",
		"roundtrip-custom.ged",
		"roundtrip-gedcom7.ged",
		"roundtrip-blanks.ged",
	];

	it.each(cases)(
		"byte-identical after parse → open on memory:// (%s)",
		async (name) => {
			const imported = name.includes("bom")
				? fixtureBinary(name)
				: fixture(name);
			const connection = `memory://roundtrip-${name}`;

			await GedcomTree.parse(imported, { connection });
			const { gedcom } = await GedcomTree.open(connection);

			expect(gedcom.toGedcom()).toBe(imported);
		}
	);

	it("builds export from stored slices after open, not a stashed input copy", async () => {
		const imported = fixture("roundtrip-551.ged");
		const connection = "memory://slice-oracle";
		await GedcomTree.parse(imported, { connection });

		// Drop any live graph from parse, open fresh from the store.
		GedcomTree.close(connection);
		const { gedcom } = await GedcomTree.open(connection);
		const link = getStoreLink(gedcom as object)!;
		const fromSlices =
			link.meta.bom +
			[...link.cache.values()]
				.sort((a, b) => a.order - b.order)
				.map((r) => r.source)
				.join("") +
			link.meta.trailer;

		expect(fromSlices).toBe(imported);
		expect(gedcom.toGedcom()).toBe(fromSlices);
	});

	it("lexGedcom preserves BOM and trailer slices that concatenate to input", () => {
		const imported = fixtureBinary("roundtrip-bom.ged");
		const lexed = lexGedcom(imported);
		const rebuilt = concatenateSources(
			lexed.bom,
			lexed.blocks,
			lexed.trailer
		);
		expect(rebuilt).toBe(imported);
		expect(lexed.bom).toBe("\uFEFF");
	});

	it("lexGedcom preserves CRLF", () => {
		const imported = fixture("roundtrip-crlf.ged");
		const lexed = lexGedcom(imported);
		expect(lexed.blocks[0].source).toContain("\r\n");
		expect(concatenateSources(lexed.bom, lexed.blocks, lexed.trailer)).toBe(
			imported
		);
	});

	it("create writes an empty tree that open can load", async () => {
		const connection = "memory://empty-create";
		const created = await GedcomTree.create(connection, {
			filename: "new.ged",
		});
		expect(created.revision).toBe(1);
		const { gedcom } = await GedcomTree.open(connection);
		expect(gedcom.HEAD).toBeTruthy();
		expect(gedcom.toGedcom()).toContain("0 HEAD");
		expect(gedcom.toGedcom()).toContain("0 TRLR");
	});

	it("delete removes the tree so open rejects", async () => {
		const connection = "memory://to-delete";
		await GedcomTree.create(connection);
		await GedcomTree.delete(connection);
		await expect(GedcomTree.open(connection)).rejects.toThrow(/not found/);
	});
});
