import type { Command } from 'commander';
import GedcomTree from '../../utils/parser.js';
import {
	formatHeader,
	formatLabel,
	formatCount,
	formatJson,
} from '../utils/formatters.js';
import { readGedcomFile, handleError } from '../utils/helpers.js';

interface StatsOptions {
	json?: boolean;
}

export function registerStatsCommand(program: Command): void {
	program
		.command('stats <file>')
		.description('Generate statistics about a GEDCOM file')
		.option('-j, --json', 'Output in JSON format')
		.action((file: string, options: StatsOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				// Use the stats() method from the GedCom class
				const stats = tree.stats();

				if (options.json) {
					console.log(formatJson(stats));
				} else {
					console.log(formatHeader('GEDCOM File Statistics\n'));
					
					console.log(formatLabel('Total Individuals'));
					console.log(`  ${formatCount(stats.totalIndividuals)}`);
					console.log(formatLabel('Total Families'));
					console.log(`  ${formatCount(stats.totalFamilies)}`);
					console.log();
					
					console.log(formatLabel('By Gender'));
					console.log(`  Males: ${formatCount(stats.byGender.males)}`);
					console.log(`  Females: ${formatCount(stats.byGender.females)}`);
					console.log(`  Unknown: ${formatCount(stats.byGender.unknown)}`);
					console.log();
					
					if (stats.dateRange.earliest && stats.dateRange.latest) {
						console.log(formatLabel('Date Range'));
						console.log(`  ${stats.dateRange.earliest} - ${stats.dateRange.latest}`);
						console.log();
					}
					
					if (stats.averageLifespan) {
						console.log(formatLabel('Average Lifespan'));
						console.log(`  ${stats.averageLifespan.toFixed(1)} years`);
						console.log();
					}
					
					if (stats.topSurnames.length > 0) {
						console.log(formatLabel('Most Common Surnames'));
						stats.topSurnames.forEach(({ surname, count }) => {
							console.log(`  ${surname}: ${formatCount(count)}`);
						});
						console.log();
					}
					
					if (stats.topBirthPlaces.length > 0) {
						console.log(formatLabel('Most Common Birth Places'));
						stats.topBirthPlaces.slice(0, 5).forEach(({ place, count }) => {
							console.log(`  ${place}: ${formatCount(count)}`);
						});
					}
				}
			} catch (error) {
				handleError(error, 'Failed to generate statistics');
			}
		});
}
