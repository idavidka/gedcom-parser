/* eslint-disable no-console */
import { writeFileSync } from "fs";
import type { Command } from "commander";
import type { IndiKey } from "../../types";
import GedcomTree from "../../utils/parser";
import {
	formatHeader,
	formatSuccess,
	formatListItem,
	formatJson,
	formatId,
	formatName,
	formatError,
} from "../utils/formatters";
import {
	readGedcomFile,
	handleError,
	cleanGedcomName,
	formatLifespan,
} from "../utils/helpers";

interface RelativesOptions {
	ancestors?: boolean;
	descendants?: boolean;
	tree?: boolean;
	depth?: string;
	output?: string;
	json?: boolean;
}

export function registerRelativesCommand(program: Command): void {
	program
		.command("relatives <file> <id>")
		.description("Get ancestors and/or descendants of an individual")
		.option("-a, --ancestors", "Include ancestors")
		.option("-d, --descendants", "Include descendants")
		.option("-t, --tree", "Include both ancestors and descendants")
		.option("--depth <n>", "Limit depth (generations)", "999")
		.option("-o, --output <file>", "Save to new GEDCOM file")
		.option("-j, --json", "Output in JSON format")
		.action((file: string, id: string, options: RelativesOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				const individual = id && tree.indi(id as IndiKey);
				if (!individual) {
					console.error(formatError(`Individual ${id} not found`));
					process.exit(1);
				}

				const maxDepth = parseInt(options.depth || "999", 10);
				const relatives = new Set<string>();
				relatives.add(id);

				// Include both if --tree is specified
				const includeAncestors = options.ancestors || options.tree;
				const includeDescendants = options.descendants || options.tree;

				// Get ancestors
				if (includeAncestors) {
					const getAncestors = (
						indi: typeof individual,
						depth: number
					) => {
						if (depth > maxDepth) return;
						const parents = indi.getParents();
						parents?.forEach((parent) => {
							if (!parent?.id) return;
							relatives.add(parent.id);
							getAncestors(parent, depth + 1);
						});
					};
					getAncestors(individual, 1);
				}

				// Get descendants
				if (includeDescendants) {
					const getDescendants = (
						indi: typeof individual,
						depth: number
					) => {
						if (depth > maxDepth) return;
						const children = indi.getChildren();
						children?.forEach((child) => {
							if (!child?.id) return;
							relatives.add(child.id);
							getDescendants(child, depth + 1);
						});
					};
					getDescendants(individual, 1);
				}

				// Get all individuals
				const allRelatives = Array.from(relatives)
					.map((relId) => tree.indi(relId as IndiKey))
					.filter((indi) => indi !== null);

				if (options.output) {
					// Create a new GEDCOM with only these individuals
					const newContent = createSubsetGedcom(tree, allRelatives);
					writeFileSync(options.output, newContent, "utf-8");
					console.log(
						formatSuccess(
							`Saved ${allRelatives.length} individuals to ${options.output}`
						)
					);
				} else if (options.json) {
					const jsonData = allRelatives
						.map(
							(indi) =>
								indi && {
									id: indi.id,
									name: cleanGedcomName(indi.NAME?.toValue()),
									birthDate:
										indi.BIRT?.DATE?.toValue() || null,
									deathDate:
										indi.DEAT?.DATE?.toValue() || null,
								}
						)
						.filter(Boolean);
					console.log(
						formatJson({
							count: jsonData.length,
							individuals: jsonData,
						})
					);
				} else {
					console.log(
						formatHeader(
							`Found ${allRelatives.length} relative(s)\n`
						)
					);
					allRelatives.forEach((indi) => {
						if (!indi) return;
						const name = cleanGedcomName(indi.NAME?.toValue());
						const lifespan = formatLifespan(
							indi.BIRT?.DATE?.toValue(),
							indi.DEAT?.DATE?.toValue()
						);
						console.log(
							formatListItem(
								`${formatId(indi.id ?? "")} ${formatName(name)} ${lifespan}`
							)
						);
					});
				}
			} catch (error) {
				handleError(error, "Failed to extract relatives");
			}
		});
}

function createSubsetGedcom(
	tree: ReturnType<typeof GedcomTree.parse>["gedcom"],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	individuals: any[]
): string {
	const lines: string[] = [];

	// Add header
	lines.push("0 HEAD");
	lines.push("1 SOUR gedcom-parser CLI");
	lines.push("1 GEDC");
	lines.push("2 VERS 5.5.1");
	lines.push("1 CHAR UTF-8");

	// Add individuals
	individuals.forEach((indi) => {
		const raw = indi.raw();
		if (raw) {
			lines.push(
				...raw.split("\n").filter((line: string) => line.trim())
			);
		}
	});

	// Add trailer
	lines.push("0 TRLR");

	return lines.join("\n");
}
