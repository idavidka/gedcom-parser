/* eslint-disable no-console */
import type { Command } from "commander";
import type { GedCom } from "../../classes/gedcom";
import type { IndiType } from "../../classes/indi";
import GedcomTree from "../../utils/parser";
import {
	formatHeader,
	formatListItem,
	formatJson,
	formatId,
	formatName,
	formatDate,
	formatWarning,
} from "../utils/formatters";
import {
	readGedcomFile,
	handleError,
	cleanGedcomName,
	formatLifespan,
} from "../utils/helpers";

interface FindOptions {
	id?: string;
	name?: string;
	birthYear?: string;
	deathYear?: string;
	json?: boolean;
}

/**
 * Find individuals in a GEDCOM tree
 * @param tree - The GEDCOM tree to search
 * @param options - Search criteria
 * @returns Array of matching individuals
 */
export function findIndividuals(
	tree: GedCom,
	options: FindOptions & { query?: string }
): IndiType[] {
	const individuals = tree.indis();
	const results: IndiType[] = [];

	// Collect all individuals that match filters
	individuals?.forEach((indi) => {
		let matches = true;

		// Filter by ID
		if (options.id && indi.id !== options.id) {
			matches = false;
		}

		// Filter by name (substring search, case insensitive)
		if ((options.name || options.query) && matches) {
			const searchName = (
				options.name ||
				options.query ||
				""
			).toLowerCase();
			const name = cleanGedcomName(indi?.toNaturalName()).toLowerCase();
			if (!name.includes(searchName)) {
				matches = false;
			}
		}

		// Filter by birth year
		if (options.birthYear && matches) {
			const year = options.birthYear;
			const birthDate = indi.BIRT?.DATE?.toValue();
			if (!birthDate?.includes(String(year))) {
				matches = false;
			}
		}

		// Filter by death year
		if (options.deathYear && matches) {
			const year = options.deathYear;
			const deathDate = indi.DEAT?.DATE?.toValue();
			if (!deathDate?.includes(String(year))) {
				matches = false;
			}
		}

		if (matches) {
			results.push(indi);
		}
	});

	return results;
}

/**
 * Format find results for output
 * @param results - Array of individuals
 * @param json - Whether to format as JSON
 */
export function formatFindResults(
	results: IndiType[],
	json: boolean = false
): void {
	if (json) {
		const jsonResults = results.map((indi) => ({
			id: indi.id,
			name: cleanGedcomName(indi.NAME?.toValue()),
			birthDate: indi.BIRT?.DATE?.toValue() || null,
			birthPlace: indi.BIRT?.PLAC?.value || null,
			deathDate: indi.DEAT?.DATE?.toValue() || null,
			deathPlace: indi.DEAT?.PLAC?.value || null,
			sex: indi.SEX?.value || null,
		}));
		console.log(
			formatJson({ count: jsonResults.length, individuals: jsonResults })
		);
	} else {
		if (results.length === 0) {
			console.log(
				formatWarning("No individuals found matching the criteria")
			);
		} else {
			console.log(
				formatHeader(`Found ${results.length} individual(s)\n`)
			);
			results.forEach((indi) => {
				const name = cleanGedcomName(indi.NAME?.toValue());
				const birthDate = indi.BIRT?.DATE?.toValue();
				const deathDate = indi.DEAT?.DATE?.toValue();
				const lifespan = formatLifespan(birthDate, deathDate);

				console.log(
					formatListItem(
						`${formatId(indi.id ?? "")} ${formatName(name)} ${lifespan}`
					)
				);

				// Show birth place if available
				const birthPlace = indi.BIRT?.PLAC?.value;
				if (birthPlace) {
					console.log(
						formatListItem(
							`Birth: ${formatDate(birthDate)} in ${birthPlace}`,
							1
						)
					);
				}

				// Show death place if available
				const deathPlace = indi.DEAT?.PLAC?.value;
				if (deathPlace) {
					console.log(
						formatListItem(
							`Death: ${formatDate(deathDate)} in ${deathPlace}`,
							1
						)
					);
				}

				console.log();
			});
		}
	}
}

export function registerFindCommand(program: Command): void {
	program
		.command("find <file> [query]")
		.description("Find individuals in a GEDCOM file")
		.option("--id <id>", "Find by GEDCOM ID")
		.option("--name <name>", "Find by name (substring search)")
		.option("--birth-year <year>", "Filter by birth year")
		.option("--death-year <year>", "Filter by death year")
		.option("-j, --json", "Output in JSON format")
		.action(
			(file: string, query: string | undefined, options: FindOptions) => {
				try {
					const content = readGedcomFile(file);
					const { gedcom: tree } = GedcomTree.parse(content);

					const results = findIndividuals(tree, {
						...options,
						query,
					});
					formatFindResults(results, options.json);
				} catch (error) {
					handleError(error, "Failed to search GEDCOM file");
				}
			}
		);
}
