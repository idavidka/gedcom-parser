import type { Command } from "commander";
import { List, Common } from "../../classes";
import type { IndiKey, MultiTag } from "../../types/types";
import GedcomTree from "../../utils/parser";
import { formatError, formatJson } from "../utils/formatters";
import { readGedcomFile, handleError } from "../utils/helpers";

interface GetOptions {
	path?: string;
	json?: boolean;
	raw?: boolean;
}

/**
 * Get a value from a GEDCOM record by path using the record's get() method
 * @param record - The GEDCOM record (individual, family, etc.)
 * @param path - Dot-separated path (e.g., "BIRT.PLAC" or "NAME")
 * @returns The value at the path, or undefined if not found
 */
function getValueByPath(
	record: Common | List,
	path: string
): Common | List | undefined {
	return record.get(path as MultiTag);
}

/**
 * Format the output value
 * @param value - The value to format
 * @param options - Formatting options
 * @returns Formatted string
 */
function formatOutput(
	value: Common | List | undefined,
	options: GetOptions
): string {
	// Handle undefined/null
	if (value === undefined || value === null) {
		return "(not found)";
	}

	// Handle List type
	if (value instanceof List) {
		if (options.json) {
			// Convert list items to JSON array
			const items: unknown[] = [];
			value.forEach((item) => {
				if (item) {
					try {
						items.push(JSON.parse(item.toJson()));
					} catch {
						items.push(item.toValue());
					}
				}
			});
			return JSON.stringify(items, null, 2);
		}

		if (options.raw) {
			// Raw GEDCOM output for each item
			const items: string[] = [];
			value.forEach((item) => {
				if (item) {
					items.push(item.toGedcom());
				}
			});
			return items.join("\n");
		}

		// Default: list values line by line
		const items: string[] = [];
		let index = 0;
		value.forEach((item) => {
			if (item) {
				const exportedValue = item.exportValue();
				items.push(
					`[${index}] ${exportedValue || item.toValue() || "(empty)"}`
				);
			}
			index++;
		});
		return items.join("\n");
	}

	// Handle Common type
	if (value instanceof Common) {
		if (options.json) {
			return value.toJson();
		}

		if (options.raw) {
			return value.toGedcom();
		}

		// Default: export value
		return value.exportValue() || value.toValue() || "(empty)";
	}

	return String(value);
}

export function registerGetCommand(program: Command): void {
	program
		.command("get <file> <id>")
		.description("Get a value from a GEDCOM record")
		.option(
			"-p, --path <path>",
			'Dot-separated path to the value (e.g., "BIRT.PLAC", "NAME")'
		)
		.option("-j, --json", "Output in JSON format")
		.option("-r, --raw", "Output raw value only (no formatting)")
		.action((file: string, id: string, options: GetOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				// Try to find the record (individual, family, etc.)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let record: any = null;
				let recordType = "";

				// Check if it's an individual
				if (id.startsWith("@I")) {
					record = tree.indi(id as IndiKey);
					recordType = "Individual";
				}
				// Check if it's a family
				else if (id.startsWith("@F")) {
					record = tree.fam(id);
					recordType = "Family";
				}
				// Check if it's a source
				else if (id.startsWith("@S")) {
					record = tree.sour(id);
					recordType = "Source";
				}
				// Check if it's a note
				else if (id.startsWith("@N")) {
					record = tree.note(id);
					recordType = "Note";
				}
				// Try as individual by default
				else {
					record = tree.indi(id as IndiKey);
					recordType = "Individual";
				}

				if (!record) {
					// eslint-disable-next-line no-console
					console.error(formatError(`Record ${id} not found`));
					process.exit(1);
				}

				// If no path specified, return the entire record
				if (!options.path) {
					if (options.json) {
						// For JSON, return a simplified version
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const simplified: any = {
							id: record.id || id,
							type: recordType,
						};

						// Add common fields for individuals
						if (recordType === "Individual") {
							if (record.NAME) {
								simplified.name = record.NAME.toValue();
							}
							if (record.BIRT) {
								simplified.birth = {
									date: record.BIRT.DATE?.toValue(),
									place: record.BIRT.PLAC?.value,
								};
							}
							if (record.DEAT) {
								simplified.death = {
									date: record.DEAT.DATE?.toValue(),
									place: record.DEAT.PLAC?.value,
								};
							}
							if (record.SEX) {
								simplified.sex = record.SEX.value;
							}
						}

						// eslint-disable-next-line no-console
						console.log(formatJson(simplified));
					} else {
						// eslint-disable-next-line no-console
						console.log(`${recordType}: ${id}`);
						if (recordType === "Individual" && record.NAME) {
							// eslint-disable-next-line no-console
							console.log(`Name: ${record.NAME.toValue()}`);
						}
					}
					return;
				}

				// Get value by path
				const value = getValueByPath(record, options.path);

				if (value === undefined) {
					// eslint-disable-next-line no-console
					console.error(
						formatError(
							`Path "${options.path}" not found in ${recordType} ${id}`
						)
					);
					process.exit(1);
				}

				// eslint-disable-next-line no-console
				console.log(formatOutput(value, options));
			} catch (error) {
				handleError(error);
			}
		});
}
