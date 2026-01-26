import type { Command } from "commander";
import type { GedCom } from "../../classes/gedcom";
import type { IndiType } from "../../classes/indi";
import type { IndiKey } from "../../types/types";
import GedcomTree from "../../utils/parser";
import {
	formatError,
	formatSuccess,
	formatId,
	formatName,
} from "../utils/formatters";
import { readGedcomFile, handleError, cleanGedcomName } from "../utils/helpers";

/**
 * Select an individual from the tree by ID or from search results by index
 */
export function selectIndividual(
	tree: GedCom,
	input: string,
	searchResults?: IndiType[]
): IndiType | undefined {
	// Check if it's an index from search results
	if (/^\d+$/.test(input) && searchResults && searchResults.length > 0) {
		const index = parseInt(input) - 1;
		if (index >= 0 && index < searchResults.length) {
			return searchResults[index];
		}
		return undefined;
	}

	// Try to select by ID
	return tree.indi(input as IndiKey);
}

/**
 * Format selection result
 */
export function formatSelectResult(
	individual: IndiType | undefined,
	input: string
): void {
	if (individual) {
		const name = cleanGedcomName(individual.NAME?.toValue());
		// eslint-disable-next-line no-console
		console.log(
			formatSuccess(
				`Selected: ${formatId(individual.id)} ${formatName(name)}`
			)
		);
	} else {
		// eslint-disable-next-line no-console
		console.log(formatError(`Individual ${input} not found`));
	}
}

export function registerSelectCommand(program: Command): void {
	program
		.command("select <file> <id>")
		.description("Select an individual by ID")
		.action((file: string, id: string) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);
				const individual = selectIndividual(tree, id);
				formatSelectResult(individual, id);

				if (!individual) {
					process.exit(1);
				}
			} catch (error) {
				handleError(error, "Failed to select individual");
			}
		});
}
