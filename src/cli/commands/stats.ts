import type { Command } from "commander";
import type { GedCom } from "../../classes/gedcom";
import GedcomTree from "../../utils/parser";
import {
	formatHeader,
	formatLabel,
	formatCount,
	formatJson,
} from "../utils/formatters";
import { readGedcomFile, handleError } from "../utils/helpers";

interface StatsOptions {
	json?: boolean;
}

/**
 * Display statistics for a GEDCOM tree (reusable core logic)
 */
export function displayStats(tree: GedCom, json: boolean = false): void {
	const stats = tree.stats();

	if (json) {
		// eslint-disable-next-line no-console
		console.log(formatJson(stats));
	} else {
		// eslint-disable-next-line no-console
		console.log(formatHeader("GEDCOM File Statistics\n"));

		// eslint-disable-next-line no-console
		console.log(formatLabel("Total Individuals"));
		// eslint-disable-next-line no-console
		console.log(`  ${formatCount(stats.totalIndividuals)}`);
		// eslint-disable-next-line no-console
		console.log(formatLabel("Total Families"));
		// eslint-disable-next-line no-console
		console.log(`  ${formatCount(stats.totalFamilies)}`);
		// eslint-disable-next-line no-console
		console.log();

		// eslint-disable-next-line no-console
		console.log(formatLabel("By Gender"));
		// eslint-disable-next-line no-console
		console.log(`  Males: ${formatCount(stats.byGender.males)}`);
		// eslint-disable-next-line no-console
		console.log(`  Females: ${formatCount(stats.byGender.females)}`);
		// eslint-disable-next-line no-console
		console.log(`  Unknown: ${formatCount(stats.byGender.unknown)}`);
		// eslint-disable-next-line no-console
		console.log();

		if (stats.dateRange.earliest && stats.dateRange.latest) {
			// eslint-disable-next-line no-console
			console.log(formatLabel("Date Range"));
			// eslint-disable-next-line no-console
			console.log(
				`  ${stats.dateRange.earliest} - ${stats.dateRange.latest}`
			);
			// eslint-disable-next-line no-console
			console.log();
		}

		if (stats.averageLifespan) {
			// eslint-disable-next-line no-console
			console.log(formatLabel("Average Lifespan"));
			// eslint-disable-next-line no-console
			console.log(`  ${stats.averageLifespan.toFixed(1)} years`);
			// eslint-disable-next-line no-console
			console.log();
		}

		if (stats.topSurnames.length > 0) {
			// eslint-disable-next-line no-console
			console.log(formatLabel("Most Common Surnames"));
			stats.topSurnames.forEach(({ surname, count }) => {
				// eslint-disable-next-line no-console
				console.log(`  ${surname}: ${formatCount(count)}`);
			});
			// eslint-disable-next-line no-console
			console.log();
		}

		if (stats.topBirthPlaces.length > 0) {
			// eslint-disable-next-line no-console
			console.log(formatLabel("Most Common Birth Places"));
			stats.topBirthPlaces.slice(0, 5).forEach(({ place, count }) => {
				// eslint-disable-next-line no-console
				console.log(`  ${place}: ${formatCount(count)}`);
			});
		}
	}
}

export function registerStatsCommand(program: Command): void {
	program
		.command("stats <file>")
		.description("Generate statistics about a GEDCOM file")
		.option("-j, --json", "Output in JSON format")
		.action((file: string, options: StatsOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);
				displayStats(tree, options.json);
			} catch (error) {
				handleError(error, "Failed to generate statistics");
			}
		});
}
