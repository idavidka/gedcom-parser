import { Command } from 'commander';
import { writeFileSync } from 'fs';
import GedcomTree from '../../utils/parser.js';
import { formatSuccess } from '../utils/formatters.js';
import { readGedcomFile, handleError } from '../utils/helpers.js';

interface MergeOptions {
	output: string;
	dedupe?: boolean;
}

export function registerMergeCommand(program: Command): void {
	program
		.command('merge <files...>')
		.description('Merge multiple GEDCOM files')
		.requiredOption('-o, --output <file>', 'Output file path (required)')
		.option('--dedupe', 'Attempt to detect and merge duplicates (basic implementation)')
		.action((files: string[], options: MergeOptions) => {
			try {
				if (files.length < 2) {
					console.error('At least 2 files are required for merging');
					process.exit(1);
				}

				const allIndividuals: any[] = [];
				const allFamilies: any[] = [];
				const seenIds = new Set<string>();
				let idCounter = 1;

				// Parse all files
				files.forEach(file => {
					const content = readGedcomFile(file);
					const { gedcom: tree } = GedcomTree.parse(content);

					const individuals = tree.indis();
					const families = tree.fams();

					// Add individuals with unique IDs
					individuals.forEach(indi => {
						let id = indi.id;
						
						// If dedupe is enabled, check for duplicates (basic check by name and birth date)
						if (options.dedupe) {
							const name = indi.NAME?.toValue();
							const birthDate = indi.BIRT?.DATE?.toValue();
							
							const duplicate = allIndividuals.find(existing => {
								return existing.NAME?.toValue() === name &&
									existing.BIRT?.DATE?.toValue() === birthDate;
							});
							
							if (duplicate) {
								// Skip duplicate
								return;
							}
						}
						
						// Ensure unique ID
						while (seenIds.has(id)) {
							id = `@I${idCounter++}@`;
						}
						seenIds.add(id);
						
						// Store with original object (we'll need to update ID in output)
						allIndividuals.push({ ...indi, newId: id });
					});

					// Add families with unique IDs
					families.forEach(fam => {
						let id = fam.id;
						while (seenIds.has(id)) {
							id = `@F${idCounter++}@`;
						}
						seenIds.add(id);
						allFamilies.push({ ...fam, newId: id });
					});
				});

				// Create merged GEDCOM
				const lines: string[] = [];
				lines.push('0 HEAD');
				lines.push('1 SOUR gedcom-parser CLI');
				lines.push('1 GEDC');
				lines.push('2 VERS 5.5.1');
				lines.push('1 CHAR UTF-8');

				// Add all individuals
				allIndividuals.forEach(indi => {
					const raw = indi.raw?.() || '';
					if (raw) {
						// Replace old ID with new ID if needed
						const updatedRaw = raw.replace(
							new RegExp(`^0 ${indi.id} INDI`, 'm'),
							`0 ${indi.newId} INDI`
						);
						lines.push(...updatedRaw.split('\n').filter(line => line.trim()));
					}
				});

				// Add all families
				allFamilies.forEach(fam => {
					const raw = fam.raw?.() || '';
					if (raw) {
						const updatedRaw = raw.replace(
							new RegExp(`^0 ${fam.id} FAM`, 'm'),
							`0 ${fam.newId} FAM`
						);
						lines.push(...updatedRaw.split('\n').filter(line => line.trim()));
					}
				});

				lines.push('0 TRLR');

				writeFileSync(options.output, lines.join('\n'), 'utf-8');
				console.log(
					formatSuccess(
						`Merged ${files.length} files (${allIndividuals.length} individuals, ${allFamilies.length} families) into ${options.output}`
					)
				);
			} catch (error) {
				handleError(error, 'Failed to merge GEDCOM files');
			}
		});
}
