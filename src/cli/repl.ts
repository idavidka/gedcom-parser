/* eslint-disable no-console */
import * as readline from "readline";
import type { FamType } from "../classes";
import type { GedComType } from "../classes/gedcom";
import type { IndiType } from "../classes/indi";
import type { IndiKey } from "../types/types";
import { findIndividuals, formatFindResults } from "./commands/find";
import { getValue } from "./commands/get";
import { selectIndividual, formatSelectResult } from "./commands/select";
import { showIndividual } from "./commands/show";
import { displayStats } from "./commands/stats";
import {
	formatHeader,
	formatError,
	formatSuccess,
	formatWarning,
	formatListItem,
	formatId,
	formatName,
	formatCount,
	formatJson,
	chalk,
} from "./utils/formatters";
import { cleanGedcomName, formatLifespan } from "./utils/helpers";

interface ReplContext {
	tree: GedComType;
	selectedPerson?: IndiType;
	searchResults?: IndiType[];
}

/**
 * Parse command line arguments, handling quoted strings
 */
function parseArgs(line: string): string[] {
	const args: string[] = [];
	let current = "";
	let inQuotes = false;
	let quoteChar = "";

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if ((char === '"' || char === "'") && !inQuotes) {
			// Start quoted string
			inQuotes = true;
			quoteChar = char;
		} else if (char === quoteChar && inQuotes) {
			// End quoted string
			inQuotes = false;
			quoteChar = "";
		} else if (char === " " && !inQuotes) {
			// Space outside quotes - end current arg
			if (current) {
				args.push(current);
				current = "";
			}
		} else {
			// Regular character
			current += char;
		}
	}

	// Add last arg if any
	if (current) {
		args.push(current);
	}

	return args;
}

export class GedcomRepl {
	private rl: readline.Interface;
	private context: ReplContext;

	constructor(tree: GedComType) {
		this.context = { tree };
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: chalk.blue("gedcom> "),
		});

		this.setupHandlers();
	}

	private setupHandlers(): void {
		this.rl.on("line", (line: string) => {
			this.handleCommand(line.trim());
		});

		this.rl.on("close", () => {
			console.log("\nGoodbye!");
			process.exit(0);
		});
	}

	private handleCommand(line: string): void {
		if (!line) {
			this.rl.prompt();
			return;
		}

		const args = parseArgs(line);
		const command = args[0];
		const commandArgs = args.slice(1);

		switch (command.toLowerCase()) {
			case "help":
				this.showHelp(commandArgs[0]);
				break;
			case "stats":
				displayStats(this.context.tree, commandArgs.includes("--json"));
				break;
			case "find":
				this.handleFind(commandArgs);
				break;
			case "select":
				this.handleSelect(commandArgs);
				break;
			case "show":
				this.handleShow(commandArgs);
				break;
			case "get":
				this.handleGet(commandArgs);
				break;
			case "relatives":
				this.handleRelatives(commandArgs);
				break;
			case "validate":
				this.handleValidate(commandArgs);
				break;
			case "clear":
				console.clear();
				break;
			case "exit":
			case "quit":
				this.rl.close();
				return;
			default:
				console.log(formatError(`Unknown command: ${command}`));
				console.log('Type "help" for available commands');
		}

		this.rl.prompt();
	}

	private showHelp(command?: string): void {
		if (command) {
			// Show help for specific command
			switch (command.toLowerCase()) {
				case "stats":
					console.log(formatHeader("\nstats"));
					console.log("Show GEDCOM file statistics\n");
					console.log("Usage: stats [--json]");
					console.log("\nOptions:");
					console.log("  --json    Output in JSON format");
					break;
				case "find":
					console.log(formatHeader("\nfind"));
					console.log("Search for individuals in the tree\n");
					console.log("Usage: find <query> [options]");
					console.log("\nArguments:");
					console.log("  <query>   Search query (name or ID)");
					console.log("\nOptions:");
					console.log("  --birth-year <year>   Filter by birth year");
					console.log("  --death-year <year>   Filter by death year");
					console.log(
						"  --json                Output in JSON format"
					);
					break;
				case "select":
					console.log(formatHeader("\nselect"));
					console.log("Select an individual by ID or index\n");
					console.log("Usage: select <id|index>");
					console.log("\nArguments:");
					console.log(
						"  <id|index>   Individual ID (e.g., @I123@) or search result index (e.g., 1)"
					);
					break;
				case "show":
					console.log(formatHeader("\nshow"));
					console.log(
						"Show detailed information about an individual\n"
					);
					console.log("Usage: show [id]");
					console.log("\nArguments:");
					console.log(
						"  [id]   Optional individual ID. If not provided, shows currently selected person"
					);
					break;
				case "get":
					console.log(formatHeader("\nget"));
					console.log("Get a value from a GEDCOM record\n");
					console.log("Usage: get [id] [options]");
					console.log("\nArguments:");
					console.log(
						"  [id]   Record ID (e.g., @I123@, @F456@). If not provided, uses selected person"
					);
					console.log("\nOptions:");
					console.log(
						'  --path, -p <path>   Dot-separated path (e.g., "BIRT.PLAC", "NAME")'
					);
					console.log("  --json, -j          Output in JSON format");
					console.log(
						"  --raw, -r           Output raw value only (no formatting)"
					);
					console.log("\nExamples:");
					console.log('  get --path "BIRT.PLAC"');
					console.log('  get @I123@ --path "NAME"');
					console.log("  get @I123@ --json");
					break;
				case "relatives":
					console.log(formatHeader("\nrelatives"));
					console.log(
						"Get ancestors and/or descendants of the selected individual\n"
					);
					console.log("Usage: relatives [options]");
					console.log("\nOptions:");
					console.log("  --ancestors, -a     Include ancestors");
					console.log("  --descendants, -d   Include descendants");
					console.log(
						"  --tree, -t          Include both ancestors and descendants"
					);
					console.log(
						"  --depth <n>         Limit depth (generations, default: 999)"
					);
					console.log("  --json, -j          Output in JSON format");
					console.log(
						"\nNote: You must select an individual first using 'select'"
					);
					console.log("\nExamples:");
					console.log("  relatives --ancestors");
					console.log("  relatives --descendants --depth 3");
					console.log("  relatives --tree --json");
					break;
				case "validate":
					console.log(formatHeader("\nvalidate"));
					console.log("Validate the GEDCOM file\n");
					console.log("Usage: validate [options]");
					console.log("\nOptions:");
					console.log("  --json, -j    Output in JSON format");
					console.log("  --strict, -s  Enable strict validation");
					console.log("\nExamples:");
					console.log("  validate");
					console.log("  validate --strict --json");
					break;
				case "clear":
					console.log(formatHeader("\nclear"));
					console.log("Clear the screen\n");
					console.log("Usage: clear");
					break;
				case "exit":
				case "quit":
					console.log(formatHeader("\nexit"));
					console.log("Exit the REPL\n");
					console.log("Usage: exit");
					console.log("Alias: quit");
					break;
				default:
					console.log(formatError(`Unknown command: ${command}`));
					console.log('Type "help" for available commands');
			}
			console.log("");
			return;
		}

		// Show all commands
		console.log(formatHeader("\nAvailable Commands:"));
		console.log("");
		console.log(
			chalk.cyan("  stats [--json]") +
				"              - Show tree statistics"
		);
		console.log(
			chalk.cyan("  find <query> [options]") +
				"     - Search for individuals"
		);
		console.log(
			chalk.cyan("  select <id|index>") +
				"          - Select an individual"
		);
		console.log(
			chalk.cyan("  show [id]") +
				"                  - Show details (current or specified person)"
		);
		console.log(
			chalk.cyan("  get [id] [options]") +
				"         - Get a value from a record"
		);
		console.log(
			chalk.cyan("  relatives [options]") +
				"        - Get ancestors/descendants of selected person"
		);
		console.log(
			chalk.cyan("  validate [options]") +
				"         - Validate the GEDCOM file"
		);
		console.log(
			chalk.cyan("  clear") + "                      - Clear screen"
		);
		console.log(
			chalk.cyan("  help [command]") +
				"             - Show this help or help for a specific command"
		);
		console.log(
			chalk.cyan("  exit") + "                       - Exit REPL"
		);
		console.log("");
	}

	private handleFind(args: string[]): void {
		if (args.length === 0) {
			console.log(formatError("Usage: find <query> [options]"));
			console.log('Type "help find" for more information');
			return;
		}

		// Parse options
		const isJson = args.includes("--json");
		let birthYear: string | undefined;
		let deathYear: string | undefined;

		// Extract birth-year
		const birthYearIndex = args.indexOf("--birth-year");
		if (birthYearIndex !== -1 && birthYearIndex + 1 < args.length) {
			birthYear = args[birthYearIndex + 1];
		}

		// Extract death-year
		const deathYearIndex = args.indexOf("--death-year");
		if (deathYearIndex !== -1 && deathYearIndex + 1 < args.length) {
			deathYear = args[deathYearIndex + 1];
		}

		// Get query (everything that's not an option or option value)
		const query = args
			.filter((a, i) => {
				if (a.startsWith("--")) return false;
				// Skip if it's a value for an option
				if (i > 0 && args[i - 1].startsWith("--")) return false;
				return true;
			})
			.join(" ");

		const results = findIndividuals(this.context.tree, {
			query: query || undefined,
			birthYear,
			deathYear,
		});

		this.context.searchResults = results;
		formatFindResults(results, isJson);

		if (results.length > 0 && !isJson) {
			console.log(
				chalk.dim(
					'\nTip: Use "select <number>" to select an individual from results'
				)
			);
		}
	}

	private handleSelect(args: string[]): void {
		if (args.length === 0) {
			console.log(formatError("Usage: select <id|index>"));
			return;
		}

		const input = args[0];
		const individual = selectIndividual(
			this.context.tree,
			input,
			this.context.searchResults
		);

		formatSelectResult(individual, input);

		if (individual) {
			this.context.selectedPerson = individual;
			console.log(chalk.dim('Tip: Use "show" to see details'));
		}
	}

	private handleShow(args: string[]): void {
		let individual: IndiType | undefined;

		if (args.length > 0) {
			// Show specific person by ID
			individual = this.context.tree.indi(args[0] as IndiKey);
			if (!individual) {
				console.log(formatError(`Individual ${args[0]} not found`));
				return;
			}
		} else {
			// Show currently selected person
			individual = this.context.selectedPerson;
			if (!individual) {
				console.log(
					formatError(
						'No person selected. Use "select <id>" first or "show <id>"'
					)
				);
				return;
			}
		}

		showIndividual(this.context.tree, individual);
	}

	private handleGet(args: string[]): void {
		if (args.length === 0) {
			console.log(
				formatError("Usage: get <id> [--path <path>] [--json] [--raw]")
			);
			console.log('Type "help get" for more information');
			return;
		}

		// Parse ID (first non-option argument)
		let id: string | undefined;
		let path: string | undefined;
		let json = false;
		let raw = false;

		// Find ID and options
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];

			if (arg === "--path" || arg === "-p") {
				if (i + 1 < args.length) {
					path = args[i + 1];
					i++; // Skip next arg
				}
			} else if (arg === "--json" || arg === "-j") {
				json = true;
			} else if (arg === "--raw" || arg === "-r") {
				raw = true;
			} else if (!arg.startsWith("-") && !id) {
				// First non-option argument is the ID
				id = arg;
			}
		}

		if (!id) {
			// Try to use selected person
			if (this.context.selectedPerson) {
				id = this.context.selectedPerson.id;
			} else {
				console.log(
					formatError("No ID specified and no person selected")
				);
				return;
			}
		}

		try {
			const result = getValue(
				this.context.tree,
				id || "",
				path,
				json,
				raw
			);
			console.log(result);
		} catch (error) {
			console.log(formatError((error as Error).message));
		}
	}

	private handleRelatives(args: string[]): void {
		// Must have a selected person
		if (!this.context.selectedPerson) {
			console.log(
				formatError('No person selected. Use "select <id>" first')
			);
			return;
		}

		// Parse options
		const isJson = args.includes("--json") || args.includes("-j");
		const includeAncestors =
			args.includes("--ancestors") ||
			args.includes("-a") ||
			args.includes("--tree") ||
			args.includes("-t");
		const includeDescendants =
			args.includes("--descendants") ||
			args.includes("-d") ||
			args.includes("--tree") ||
			args.includes("-t");

		if (!includeAncestors && !includeDescendants) {
			console.log(
				formatError(
					"Must specify --ancestors, --descendants, or --tree"
				)
			);
			console.log('Type "help relatives" for more information');
			return;
		}

		// Get depth option
		let maxDepth = 999;
		const depthIndex = args.findIndex((arg) => arg === "--depth");
		if (depthIndex !== -1 && depthIndex + 1 < args.length) {
			maxDepth = parseInt(args[depthIndex + 1], 10);
			if (isNaN(maxDepth) || maxDepth < 1) {
				console.log(formatError("Invalid depth value"));
				return;
			}
		}

		const individual = this.context.selectedPerson;
		const relatives = new Set<string>();
		individual?.id && relatives.add(individual.id);

		// Get ancestors
		if (includeAncestors) {
			const getAncestors = (indi: IndiType, depth: number) => {
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
			const getDescendants = (indi: IndiType, depth: number) => {
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
			.map((relId) => this.context.tree.indi(relId as IndiKey))
			.filter((indi) => indi !== null);

		if (isJson) {
			const jsonData = allRelatives
				.map(
					(indi) =>
						indi && {
							id: indi.id,
							name: cleanGedcomName(indi.NAME?.toValue()),
							birthDate: indi.BIRT?.DATE?.toValue() || null,
							deathDate: indi.DEAT?.DATE?.toValue() || null,
						}
				)
				.filter(Boolean);
			console.log(
				formatJson({ count: jsonData.length, individuals: jsonData })
			);
		} else {
			console.log(
				formatHeader(`Found ${allRelatives.length} relative(s)\n`)
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
	}

	private handleValidate(args: string[]): void {
		// Parse options
		const isJson = args.includes("--json") || args.includes("-j");
		const isStrict = args.includes("--strict") || args.includes("-s");

		const errors: string[] = [];
		const warnings: string[] = [];

		// Get GEDCOM version
		const header = this.context.tree.HEAD;
		const version = header?.GEDC?.VERS?.value || "Unknown";

		// Basic validation checks
		const individuals = this.context.tree.indis();
		const families = this.context.tree.fams();

		// Check for individuals without names
		individuals?.forEach((indi) => {
			if (!indi.NAME?.toValue()) {
				warnings.push(`Individual ${indi.id} is missing a name`);
			}
		});

		// Check for individuals without birth dates
		let missingBirthDates = 0;
		individuals?.forEach((indi) => {
			if (!indi.BIRT?.DATE?.toValue()) {
				missingBirthDates++;
			}
		});

		// Check for individuals without death dates (but marked as deceased)
		let missingDeathDates = 0;
		individuals?.forEach((indi) => {
			if (indi.DEAT && !indi.DEAT.DATE?.toValue()) {
				missingDeathDates++;
			}
		});

		// Check for duplicate IDs
		const seenIds = new Set<string>();
		const duplicateIds: string[] = [];
		const checkDuplicates = (item: IndiType | FamType) => {
			if (!item.id) {
				return;
			}
			if (seenIds.has(item.id)) {
				duplicateIds.push(item.id);
				errors.push(`Duplicate ID found: ${item.id}`);
			}
			seenIds.add(item.id);
		};

		individuals?.forEach(checkDuplicates);
		families?.forEach(checkDuplicates);

		// Check for missing family members
		families?.forEach((fam) => {
			const husb = fam.HUSB?.value;
			const wife = fam.WIFE?.value;

			if (!husb && !wife) {
				warnings.push(`Family ${fam.id} has no husband or wife`);
			}

			if (husb && !this.context.tree.indi(husb as IndiKey)) {
				errors.push(
					`Family ${fam.id} references non-existent husband ${husb}`
				);
			}

			if (wife && !this.context.tree.indi(wife as IndiKey)) {
				errors.push(
					`Family ${fam.id} references non-existent wife ${wife}`
				);
			}
		});

		// Check for invalid date formats (basic check)
		if (isStrict) {
			individuals?.forEach((indi) => {
				const birthDate = indi.BIRT?.DATE?.toValue();
				const deathDate = indi.DEAT?.DATE?.toValue();

				if (birthDate && birthDate.includes("INVALID")) {
					errors.push(`Invalid birth date format for ${indi.id}`);
				}

				if (deathDate && deathDate.includes("INVALID")) {
					errors.push(`Invalid death date format for ${indi.id}`);
				}
			});
		}

		const result = {
			valid: errors.length === 0,
			version,
			errors,
			warnings,
		};

		if (isJson) {
			console.log(formatJson(result));
		} else {
			if (result.valid) {
				console.log(formatSuccess(`Valid GEDCOM ${version} file`));
			} else {
				console.log(
					formatError(
						`Invalid GEDCOM file - ${errors.length} error(s) found`
					)
				);
			}

			console.log();
			console.log(formatHeader("Validation Summary"));
			console.log(
				`${formatError("Errors:")} ${formatCount(errors.length)}`
			);
			console.log(
				`${formatWarning("Warnings:")} ${formatCount(warnings.length)}`
			);

			if (errors.length > 0) {
				console.log();
				console.log(formatHeader("Errors"));
				errors.slice(0, 10).forEach((error) => {
					console.log(formatListItem(formatError(error)));
				});
				if (errors.length > 10) {
					console.log(
						formatListItem(
							`... and ${errors.length - 10} more errors`
						)
					);
				}
			}

			if (warnings.length > 0) {
				console.log();
				console.log(formatHeader("Warnings"));

				// Summarize warnings
				if (missingBirthDates > 0) {
					console.log(
						formatListItem(
							formatWarning(
								`Missing birth dates: ${missingBirthDates} individuals`
							)
						)
					);
				}
				if (missingDeathDates > 0) {
					console.log(
						formatListItem(
							formatWarning(
								`Missing death dates: ${missingDeathDates} individuals`
							)
						)
					);
				}
				if (duplicateIds.length > 0) {
					console.log(
						formatListItem(
							formatWarning(
								`Duplicate IDs: ${duplicateIds.length}`
							)
						)
					);
				}

				// Show first few specific warnings
				const otherWarnings = warnings.filter(
					(w) => !w.includes("birth") && !w.includes("death")
				);
				otherWarnings.slice(0, 5).forEach((warning) => {
					console.log(formatListItem(formatWarning(warning)));
				});
				if (otherWarnings.length > 5) {
					console.log(
						formatListItem(
							`... and ${otherWarnings.length - 5} more warnings`
						)
					);
				}
			}
		}
	}

	start(): void {
		console.log(formatHeader("GEDCOM Interactive Explorer"));
		console.log("");
		console.log(chalk.dim('Type "help" for available commands'));
		console.log("");
		this.rl.prompt();
	}
}
