/* eslint-disable no-console */
import { writeFileSync } from "fs";
import type { Command } from "commander";
import GedcomTree from "../../utils/parser";
import { formatError, formatSuccess } from "../utils/formatters";
import { readGedcomFile, handleError, cleanGedcomName } from "../utils/helpers";

interface ExtractOptions {
	output: string;
	surname?: string;
	birthAfter?: string;
	birthBefore?: string;
	deathAfter?: string;
	deathBefore?: string;
}

export function registerExtractCommand(program: Command): void {
	program
		.command("extract <file>")
		.description("Extract a subset of individuals to a new GEDCOM file")
		.requiredOption("-o, --output <file>", "Output file path (required)")
		.option("--surname <name>", "Filter by surname")
		.option(
			"--birth-after <year>",
			"Include individuals born after this year"
		)
		.option(
			"--birth-before <year>",
			"Include individuals born before this year"
		)
		.option(
			"--death-after <year>",
			"Include individuals who died after this year"
		)
		.option(
			"--death-before <year>",
			"Include individuals who died before this year"
		)
		.action((file: string, options: ExtractOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				const individuals = tree.indis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const results: any[] = [];

				// Collect individuals that match all filters
				individuals?.forEach((indi) => {
					let matches = true;

					// Filter by surname
					if (options.surname && matches) {
						const searchSurname = options.surname.toLowerCase();
						const name = cleanGedcomName(
							indi.NAME?.toValue()
						).toLowerCase();
						matches = name.includes(searchSurname);
					}

					// Filter by birth year
					if (options.birthAfter && matches) {
						const year = parseInt(options.birthAfter, 10);
						const birthDate = indi.BIRT?.DATE?.toValue();
						const match = birthDate?.match(/\d{4}/);
						matches = Boolean(
							match && parseInt(match[0], 10) > year
						);
					}

					if (options.birthBefore && matches) {
						const year = parseInt(options.birthBefore, 10);
						const birthDate = indi.BIRT?.DATE?.toValue();
						const match = birthDate?.match(/\d{4}/);
						matches = Boolean(
							match && parseInt(match[0], 10) < year
						);
					}

					// Filter by death year
					if (options.deathAfter && matches) {
						const year = parseInt(options.deathAfter, 10);
						const deathDate = indi.DEAT?.DATE?.toValue();
						const match = deathDate?.match(/\d{4}/);
						matches = Boolean(
							match && parseInt(match[0], 10) > year
						);
					}

					if (options.deathBefore && matches) {
						const year = parseInt(options.deathBefore, 10);
						const deathDate = indi.DEAT?.DATE?.toValue();
						const match = deathDate?.match(/\d{4}/);
						matches = Boolean(
							match && parseInt(match[0], 10) < year
						);
					}

					if (matches) {
						results.push(indi);
					}
				});

				if (results.length === 0) {
					console.log(
						formatError("No individuals match the criteria")
					);
					process.exit(1);
				}

				// Create subset GEDCOM
				const lines: string[] = [];
				lines.push("0 HEAD");
				lines.push("1 SOUR gedcom-parser CLI");
				lines.push("1 GEDC");
				lines.push("2 VERS 5.5.1");
				lines.push("1 CHAR UTF-8");

				results.forEach((indi) => {
					const raw = indi.raw();
					if (raw) {
						lines.push(
							...raw
								.split("\n")
								.filter((line: string) => line.trim())
						);
					}
				});

				lines.push("0 TRLR");

				writeFileSync(options.output, lines.join("\n"), "utf-8");
				console.log(
					formatSuccess(
						`Extracted ${results.length} individuals to ${options.output}`
					)
				);
			} catch (error) {
				handleError(error, "Failed to extract individuals");
			}
		});
}
