import type { Command } from "commander";
import GedcomTree from "../../utils/parser";
import { GedcomRepl } from "../repl";
import { readGedcomFile, handleError } from "../utils/helpers";

export function registerOpenCommand(program: Command): void {
	program
		.command("open <file>")
		.description("Open GEDCOM file in interactive mode")
		.action((file: string) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);
				const repl = new GedcomRepl(tree);
				repl.start();
			} catch (error) {
				handleError(error, "Failed to open GEDCOM file");
			}
		});
}
