import * as readline from "readline";
import type { GedCom } from "../classes/gedcom";
import type { IndiType } from "../classes/indi";
import type { IndiKey } from "../types/types";
import { findIndividuals, formatFindResults } from "./commands/find";
import { getValue } from "./commands/get";
import { selectIndividual, formatSelectResult } from "./commands/select";
import { showIndividual } from "./commands/show";
import { displayStats } from "./commands/stats";
import { formatHeader, formatError, chalk } from "./utils/formatters";

interface ReplContext {
	tree: GedCom;
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

	constructor(tree: GedCom) {
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
			// eslint-disable-next-line no-console
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
			case "clear":
				// eslint-disable-next-line no-console
				console.clear();
				break;
			case "exit":
			case "quit":
				this.rl.close();
				return;
			default:
				// eslint-disable-next-line no-console
				console.log(formatError(`Unknown command: ${command}`));
				// eslint-disable-next-line no-console
				console.log('Type "help" for available commands');
		}

		this.rl.prompt();
	}

	private showHelp(command?: string): void {
		if (command) {
			// Show help for specific command
			switch (command.toLowerCase()) {
				case "stats":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nstats"));
					// eslint-disable-next-line no-console
					console.log("Show GEDCOM file statistics\n");
					// eslint-disable-next-line no-console
					console.log("Usage: stats [--json]");
					// eslint-disable-next-line no-console
					console.log("\nOptions:");
					// eslint-disable-next-line no-console
					console.log("  --json    Output in JSON format");
					break;
				case "find":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nfind"));
					// eslint-disable-next-line no-console
					console.log("Search for individuals in the tree\n");
					// eslint-disable-next-line no-console
					console.log("Usage: find <query> [options]");
					// eslint-disable-next-line no-console
					console.log("\nArguments:");
					// eslint-disable-next-line no-console
					console.log("  <query>   Search query (name or ID)");
					// eslint-disable-next-line no-console
					console.log("\nOptions:");
					// eslint-disable-next-line no-console
					console.log("  --birth-year <year>   Filter by birth year");
					// eslint-disable-next-line no-console
					console.log("  --death-year <year>   Filter by death year");
					// eslint-disable-next-line no-console
					console.log(
						"  --json                Output in JSON format"
					);
					break;
				case "select":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nselect"));
					// eslint-disable-next-line no-console
					console.log("Select an individual by ID or index\n");
					// eslint-disable-next-line no-console
					console.log("Usage: select <id|index>");
					// eslint-disable-next-line no-console
					console.log("\nArguments:");
					// eslint-disable-next-line no-console
					console.log(
						"  <id|index>   Individual ID (e.g., @I123@) or search result index (e.g., 1)"
					);
					break;
				case "show":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nshow"));
					// eslint-disable-next-line no-console
					console.log(
						"Show detailed information about an individual\n"
					);
					// eslint-disable-next-line no-console
					console.log("Usage: show [id]");
					// eslint-disable-next-line no-console
					console.log("\nArguments:");
					// eslint-disable-next-line no-console
					console.log(
						"  [id]   Optional individual ID. If not provided, shows currently selected person"
					);
					break;
				case "get":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nget"));
					// eslint-disable-next-line no-console
					console.log("Get a value from a GEDCOM record\n");
					// eslint-disable-next-line no-console
					console.log("Usage: get [id] [options]");
					// eslint-disable-next-line no-console
					console.log("\nArguments:");
					// eslint-disable-next-line no-console
					console.log(
						"  [id]   Record ID (e.g., @I123@, @F456@). If not provided, uses selected person"
					);
					// eslint-disable-next-line no-console
					console.log("\nOptions:");
					// eslint-disable-next-line no-console
					console.log(
						'  --path, -p <path>   Dot-separated path (e.g., "BIRT.PLAC", "NAME")'
					);
					// eslint-disable-next-line no-console
					console.log("  --json, -j          Output in JSON format");
					// eslint-disable-next-line no-console
					console.log(
						"  --raw, -r           Output raw value only (no formatting)"
					);
					// eslint-disable-next-line no-console
					console.log("\nExamples:");
					// eslint-disable-next-line no-console
					console.log('  get --path "BIRT.PLAC"');
					// eslint-disable-next-line no-console
					console.log('  get @I123@ --path "NAME"');
					// eslint-disable-next-line no-console
					console.log("  get @I123@ --json");
					break;
				case "clear":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nclear"));
					// eslint-disable-next-line no-console
					console.log("Clear the screen\n");
					// eslint-disable-next-line no-console
					console.log("Usage: clear");
					break;
				case "exit":
				case "quit":
					// eslint-disable-next-line no-console
					console.log(formatHeader("\nexit"));
					// eslint-disable-next-line no-console
					console.log("Exit the REPL\n");
					// eslint-disable-next-line no-console
					console.log("Usage: exit");
					// eslint-disable-next-line no-console
					console.log("Alias: quit");
					break;
				default:
					// eslint-disable-next-line no-console
					console.log(formatError(`Unknown command: ${command}`));
					// eslint-disable-next-line no-console
					console.log('Type "help" for available commands');
			}
			// eslint-disable-next-line no-console
			console.log("");
			return;
		}

		// Show all commands
		// eslint-disable-next-line no-console
		console.log(formatHeader("\nAvailable Commands:"));
		// eslint-disable-next-line no-console
		console.log("");
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  stats [--json]") +
				"              - Show tree statistics"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  find <query> [options]") +
				"     - Search for individuals"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  select <id|index>") +
				"          - Select an individual"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  show [id]") +
				"                  - Show details (current or specified person)"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  get [id] [options]") +
				"         - Get a value from a record"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  clear") + "                      - Clear screen"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  help [command]") +
				"             - Show this help or help for a specific command"
		);
		// eslint-disable-next-line no-console
		console.log(
			chalk.cyan("  exit") + "                       - Exit REPL"
		);
		// eslint-disable-next-line no-console
		console.log("");
	}

	private handleFind(args: string[]): void {
		if (args.length === 0) {
			// eslint-disable-next-line no-console
			console.log(formatError("Usage: find <query> [options]"));
			// eslint-disable-next-line no-console
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
			// eslint-disable-next-line no-console
			console.log(
				chalk.dim(
					'\nTip: Use "select <number>" to select an individual from results'
				)
			);
		}
	}

	private handleSelect(args: string[]): void {
		if (args.length === 0) {
			// eslint-disable-next-line no-console
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
			// eslint-disable-next-line no-console
			console.log(chalk.dim('Tip: Use "show" to see details'));
		}
	}

	private handleShow(args: string[]): void {
		let individual: IndiType | undefined;

		if (args.length > 0) {
			// Show specific person by ID
			individual = this.context.tree.indi(args[0] as IndiKey);
			if (!individual) {
				// eslint-disable-next-line no-console
				console.log(formatError(`Individual ${args[0]} not found`));
				return;
			}
		} else {
			// Show currently selected person
			individual = this.context.selectedPerson;
			if (!individual) {
				// eslint-disable-next-line no-console
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
			// eslint-disable-next-line no-console
			console.log(
				formatError("Usage: get <id> [--path <path>] [--json] [--raw]")
			);
			// eslint-disable-next-line no-console
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
				// eslint-disable-next-line no-console
				console.log(
					formatError("No ID specified and no person selected")
				);
				return;
			}
		}

		try {
			const result = getValue(this.context.tree, id, path, json, raw);
			// eslint-disable-next-line no-console
			console.log(result);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.log(formatError((error as Error).message));
		}
	}

	start(): void {
		// eslint-disable-next-line no-console
		console.log(formatHeader("GEDCOM Interactive Explorer"));
		// eslint-disable-next-line no-console
		console.log("");
		// eslint-disable-next-line no-console
		console.log(chalk.dim('Type "help" for available commands'));
		// eslint-disable-next-line no-console
		console.log("");
		this.rl.prompt();
	}
}
