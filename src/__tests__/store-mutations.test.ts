import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import GedcomTree from "../index";
import { getStoreLink } from "../store/session";
import { resetSharedMemoryStore } from "../store/memory-store";
import { lexGedcom } from "../store/lex";
import * as LexModule from "../store/lex";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const load551 = () =>
	readFileSync(resolve(__dirname, "mocks/store/roundtrip-551.ged"), "utf8");

describe("GEDCOM store mutations", () => {
	beforeEach(() => {
		resetSharedMemoryStore();
	});

	it("keeps untouched record source slices after addChild + flush + open", async () => {
		const imported = load551();
		const connection = "memory://mutate-add-child";
		const { gedcom } = await GedcomTree.parse(imported, { connection });
		const before = getStoreLink(gedcom as object)!;
		const i1Source = before.cache.get("I1")!.source;
		const f1Source = before.cache.get("F1")!.source;

		const father = gedcom.indi("@I1@");
		expect(father).toBeTruthy();
		const child = gedcom.createIndividual();
		child.set("NAME" as never, "New /Child/");
		child.set("SEX" as never, "M");
		father!.addChild(child);

		await (gedcom as { flush: () => Promise<unknown> }).flush();
		GedcomTree.close(connection);

		const { gedcom: again } = await GedcomTree.open(connection);
		const link = getStoreLink(again as object)!;

		// Unrelated records keep the imported slice.
		expect(link.cache.get("I2")!.source).toBe(
			before.cache.get("I2")!.source
		);
		expect(link.cache.get("S1")!.source).toBe(
			before.cache.get("S1")!.source
		);
		expect(link.cache.get("O1")!.source).toBe(
			before.cache.get("O1")!.source
		);

		const exported = again.toGedcom();
		expect(exported).toContain("New /Child/");
		expect(i1Source).toBeTruthy();
		expect(f1Source).toBeTruthy();
	});

	it("bumps revision by 1 per flush, not per dirty record", async () => {
		const imported = load551();
		const connection = "memory://rev-bump";
		const { gedcom, revision } = await GedcomTree.parse(imported, {
			connection,
		});
		expect(revision).toBe(1);

		gedcom.indi("@I1@")?.set("NAME" as never, "Changed /Name/");
		gedcom.indi("@I2@")?.set("NAME" as never, "Also /Changed/");
		const result = await (
			gedcom as { flush: () => Promise<{ revision: number }> }
		).flush();
		expect(result.revision).toBe(2);

		const { revision: openedRev } = await GedcomTree.open(connection);
		expect(openedRev).toBe(2);
	});

	it("fork mutations do not change the parent meta.revision", async () => {
		const imported = load551();
		const connection = "memory://fork-iso";
		const { gedcom } = await GedcomTree.parse(imported, { connection });
		const parentLink = getStoreLink(gedcom as object)!;
		const parentRev = parentLink.revision;

		const forked = (
			gedcom as { fork: () => typeof gedcom }
		).fork();
		forked.indi("@I1@")?.set("NAME" as never, "Forked /Name/");
		await (forked as { flush: () => Promise<unknown> }).flush();

		expect(getStoreLink(gedcom as object)!.revision).toBe(parentRev);
		expect(gedcom.indi("@I1@")?.get("NAME")?.toValue()).not.toBe(
			"Forked /Name/"
		);
	});

	it("flush does not call lexGedcom", async () => {
		const imported = load551();
		const connection = "memory://no-lex-on-flush";
		const { gedcom } = await GedcomTree.parse(imported, { connection });

		const spy = vi.spyOn(LexModule, "lexGedcom");
		spy.mockClear();

		gedcom.indi("@I1@")?.set("NAME" as never, "Spy /Name/");
		await (gedcom as { flush: () => Promise<unknown> }).flush();

		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("tombstone: deleted person is gone after open", async () => {
		const imported = load551();
		const connection = "memory://tombstone";
		const { gedcom } = await GedcomTree.parse(imported, { connection });

		expect(gedcom.indi("@I3@")).toBeTruthy();
		const { deleteIndividual } = await import("../utils/family-edit");
		deleteIndividual(gedcom, "@I3@");

		await (gedcom as { flush: () => Promise<unknown> }).flush();
		GedcomTree.close(connection);

		const { gedcom: again } = await GedcomTree.open(connection);
		expect(again.indi("@I3@")).toBeUndefined();
	});

	it("clean export concatenates sources without re-lexing", () => {
		const imported = load551();
		const lexed = lexGedcom(imported);
		const joined =
			lexed.bom +
			lexed.blocks.map((b) => b.source).join("") +
			lexed.trailer;
		expect(joined).toBe(imported);
	});
});
