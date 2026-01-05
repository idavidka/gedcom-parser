import { Command } from 'commander';
import {
	formatHeader,
	formatLabel,
	formatCount,
	formatJson,
} from '../utils/formatters.js';
import { readGedcomFile, handleError } from '../utils/helpers.js';
import GedcomTree from '../../utils/parser.js';

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

				const individuals = tree.indis();
				const families = tree.fams();

				// Calculate statistics
				const totalIndividuals = individuals.length;
				const totalFamilies = families.length;

				// Count by sex
				let males = 0;
				let females = 0;
				let unknownSex = 0;
				
				individuals.forEach(indi => {
					const sex = indi.SEX?.value;
					if (sex === 'M') males++;
					else if (sex === 'F') females++;
					else unknownSex++;
				});

				// Most common surnames
				const surnames = new Map<string, number>();
				individuals.forEach(indi => {
					const name = indi.NAME?.toValue();
					if (name) {
						const match = name.match(/\/(.+?)\//);
						if (match) {
							const surname = match[1];
							surnames.set(surname, (surnames.get(surname) || 0) + 1);
						}
					}
				});

				const topSurnames = Array.from(surnames.entries())
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10)
					.map(([surname, count]) => ({ surname, count }));

				// Most common birth places
				const birthPlaces = new Map<string, number>();
				individuals.forEach(indi => {
					const place = indi.BIRT?.PLAC?.value;
					if (place) {
						birthPlaces.set(place, (birthPlaces.get(place) || 0) + 1);
					}
				});

				const topBirthPlaces = Array.from(birthPlaces.entries())
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10)
					.map(([place, count]) => ({ place, count }));

				// Date range
				const years: number[] = [];
				individuals.forEach(indi => {
					const birthDate = indi.BIRT?.DATE?.toValue();
					if (birthDate) {
						const match = birthDate.match(/\d{4}/);
						if (match) {
							years.push(parseInt(match[0], 10));
						}
					}
					const deathDate = indi.DEAT?.DATE?.toValue();
					if (deathDate) {
						const match = deathDate.match(/\d{4}/);
						if (match) {
							years.push(parseInt(match[0], 10));
						}
					}
				});

				const minYear = years.length > 0 ? Math.min(...years) : null;
				const maxYear = years.length > 0 ? Math.max(...years) : null;

				// Average lifespan
				const lifespans: number[] = [];
				individuals.forEach(indi => {
					const birthDate = indi.BIRT?.DATE?.toValue();
					const deathDate = indi.DEAT?.DATE?.toValue();
					if (birthDate && deathDate) {
						const birthMatch = birthDate.match(/\d{4}/);
						const deathMatch = deathDate.match(/\d{4}/);
						if (birthMatch && deathMatch) {
							const birthYear = parseInt(birthMatch[0], 10);
							const deathYear = parseInt(deathMatch[0], 10);
							if (deathYear > birthYear) {
								lifespans.push(deathYear - birthYear);
							}
						}
					}
				});

				const avgLifespan = lifespans.length > 0
					? lifespans.reduce((sum, age) => sum + age, 0) / lifespans.length
					: null;

				const stats = {
					totalIndividuals,
					totalFamilies,
					byGender: {
						males,
						females,
						unknown: unknownSex,
					},
					dateRange: {
						earliest: minYear,
						latest: maxYear,
					},
					averageLifespan: avgLifespan ? Math.round(avgLifespan * 10) / 10 : null,
					topSurnames,
					topBirthPlaces,
				};

				if (options.json) {
					console.log(formatJson(stats));
				} else {
					console.log(formatHeader('GEDCOM File Statistics\n'));
					
					console.log(formatLabel('Total Individuals'));
					console.log(`  ${formatCount(totalIndividuals)}`);
					console.log(formatLabel('Total Families'));
					console.log(`  ${formatCount(totalFamilies)}`);
					console.log();
					
					console.log(formatLabel('By Gender'));
					console.log(`  Males: ${formatCount(males)}`);
					console.log(`  Females: ${formatCount(females)}`);
					console.log(`  Unknown: ${formatCount(unknownSex)}`);
					console.log();
					
					if (minYear && maxYear) {
						console.log(formatLabel('Date Range'));
						console.log(`  ${minYear} - ${maxYear}`);
						console.log();
					}
					
					if (avgLifespan) {
						console.log(formatLabel('Average Lifespan'));
						console.log(`  ${avgLifespan.toFixed(1)} years`);
						console.log();
					}
					
					if (topSurnames.length > 0) {
						console.log(formatLabel('Most Common Surnames'));
						topSurnames.forEach(({ surname, count }) => {
							console.log(`  ${surname}: ${formatCount(count)}`);
						});
						console.log();
					}
					
					if (topBirthPlaces.length > 0) {
						console.log(formatLabel('Most Common Birth Places'));
						topBirthPlaces.slice(0, 5).forEach(({ place, count }) => {
							console.log(`  ${place}: ${formatCount(count)}`);
						});
					}
				}
			} catch (error) {
				handleError(error, 'Failed to generate statistics');
			}
		});
}
