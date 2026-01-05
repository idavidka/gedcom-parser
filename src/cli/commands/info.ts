import { Command } from 'commander';
import GedcomTree from '../../utils/parser.js';
import {
	formatHeader,
	formatLabel,
	formatValue,
	formatCount,
	formatJson,
	formatSuccess,
} from '../utils/formatters.js';
import { readGedcomFile, handleError } from '../utils/helpers.js';

interface InfoOptions {
	json?: boolean;
	verbose?: boolean;
}

export function registerInfoCommand(program: Command): void {
	program
		.command('info <file>')
		.description('Display basic information about a GEDCOM file')
		.option('-j, --json', 'Output in JSON format')
		.option('-v, --verbose', 'Show detailed information')
		.action((file: string, options: InfoOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				const individuals = tree.indis();
				const families = tree.fams();
				const sources = tree.sours();
				const repos = tree.repos();
				const objes = tree.objes();
				const submitters = tree.subms();

				// Get GEDCOM version from header
				const header = tree.HEAD;
				const version = header?.GEDC?.VERS?.value || 'Unknown';

				const info = {
					file,
					version,
					individuals: individuals?.length || 0,
					families: families?.length || 0,
					sources: sources?.length || 0,
					repositories: repos?.length || 0,
					mediaObjects: objes?.length || 0,
					submitters: submitters?.length || 0,
				};

				if (options.json) {
					console.log(formatJson(info));
				} else {
					console.log(formatSuccess('GEDCOM file parsed successfully\n'));
					console.log(formatHeader('File Information'));
					console.log(`${formatLabel('File')} ${formatValue(file)}`);
					console.log(`${formatLabel('GEDCOM Version')} ${formatValue(version)}`);
					console.log();
					console.log(formatHeader('Statistics'));
					console.log(`${formatLabel('Individuals')} ${formatCount(individuals?.length || 0)}`);
					console.log(`${formatLabel('Families')} ${formatCount(families?.length || 0)}`);
					console.log(`${formatLabel('Sources')} ${formatCount(sources?.length || 0)}`);
					console.log(`${formatLabel('Repositories')} ${formatCount(repos?.length || 0)}`);
					console.log(`${formatLabel('Media Objects')} ${formatCount(objes?.length || 0)}`);
					console.log(`${formatLabel('Submitters')} ${formatCount(submitters?.length || 0)}`);

					if (options.verbose) {
						console.log();
						console.log(formatHeader('Additional Details'));
						
						// Most common surnames
						const surnames = new Map<string, number>();
						individuals.forEach((indi) => {
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
							.slice(0, 5);

						if (topSurnames.length > 0) {
							console.log(`${formatLabel('Most Common Surnames')}`);
							topSurnames.forEach(([surname, count]) => {
								console.log(`  - ${surname}: ${formatCount(count)}`);
							});
						}
					}
				}
			} catch (error) {
				handleError(error, 'Failed to parse GEDCOM file');
			}
		});
}
