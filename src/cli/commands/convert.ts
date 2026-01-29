/* eslint-disable no-console */
import { writeFileSync } from "fs";
import type { Command } from "commander";
import GedcomTree from "../../utils/parser";
import { formatSuccess, formatJson } from "../utils/formatters";
import { readGedcomFile, handleError, cleanGedcomName } from "../utils/helpers";

interface ConvertOptions {
	format: "json" | "csv" | "markdown";
	output?: string;
}

export function registerConvertCommand(program: Command): void {
	program
		.command("convert <file>")
		.description("Convert GEDCOM to another format")
		.requiredOption(
			"-f, --format <format>",
			"Output format: json, csv, markdown"
		)
		.option("-o, --output <file>", "Output file path")
		.action((file: string, options: ConvertOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				const individuals = tree.indis();
				let outputContent = "";

				if (options.format === "json") {
					const jsonData = individuals?.map((indi) => ({
						id: indi.id,
						name: cleanGedcomName(indi.NAME?.toValue()),
						sex: indi.SEX?.value || null,
						birthDate: indi.BIRT?.DATE?.toValue() || null,
						birthPlace: indi.BIRT?.PLAC?.value || null,
						deathDate: indi.DEAT?.DATE?.toValue() || null,
						deathPlace: indi.DEAT?.PLAC?.value || null,
					}));
					outputContent = formatJson(jsonData);
				} else if (options.format === "csv") {
					const lines: string[] = [];
					lines.push(
						"ID,Name,Sex,Birth Date,Birth Place,Death Date,Death Place"
					);

					individuals?.forEach((indi) => {
						const csvEscape = (str: string | null | undefined) => {
							if (!str) return "";
							if (str.includes(",") || str.includes('"')) {
								return `"${str.replace(/"/g, '""')}"`;
							}
							return str;
						};

						lines.push(
							[
								csvEscape(indi.id),
								csvEscape(
									cleanGedcomName(indi.NAME?.toValue())
								),
								csvEscape(indi.SEX?.value),
								csvEscape(indi.BIRT?.DATE?.toValue()),
								csvEscape(indi.BIRT?.PLAC?.value),
								csvEscape(indi.DEAT?.DATE?.toValue()),
								csvEscape(indi.DEAT?.PLAC?.value),
							].join(",")
						);
					});

					outputContent = lines.join("\n");
				} else if (options.format === "markdown") {
					const lines: string[] = [];
					lines.push("# GEDCOM Individuals\n");
					lines.push("| ID | Name | Sex | Birth | Death |");
					lines.push("|----|------|-----|-------|-------|");

					individuals?.forEach((indi) => {
						const name =
							cleanGedcomName(indi.NAME?.toValue()) || "?";
						const sex = indi.SEX?.value || "?";
						const birth = indi.BIRT?.DATE?.toValue() || "?";
						const death = indi.DEAT?.DATE?.toValue() || "?";

						lines.push(
							`| ${indi.id} | ${name} | ${sex} | ${birth} | ${death} |`
						);
					});

					outputContent = lines.join("\n");
				} else {
					console.error(`Unsupported format: ${options.format}`);
					process.exit(1);
				}

				if (options.output) {
					writeFileSync(options.output, outputContent, "utf-8");
					console.log(
						formatSuccess(
							`Converted to ${options.format} and saved to ${options.output}`
						)
					);
				} else {
					console.log(outputContent);
				}
			} catch (error) {
				handleError(error, "Failed to convert GEDCOM file");
			}
		});
}
