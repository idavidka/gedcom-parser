import type { Command } from 'commander';
import GedcomTree from '../../utils/parser';
import {
	formatHeader,
	formatSuccess,
	formatWarning,
	formatError,
	formatListItem,
	formatJson,
	formatCount,
} from '../utils/formatters';
import { readGedcomFile, handleError } from '../utils/helpers';

interface ValidateOptions {
	json?: boolean;
	strict?: boolean;
	fix?: boolean;
}

interface ValidationResult {
	valid: boolean;
	version: string;
	errors: string[];
	warnings: string[];
}

export function registerValidateCommand(program: Command): void {
	program
		.command('validate <file>')
		.description('Validate a GEDCOM file')
		.option('-j, --json', 'Output in JSON format')
		.option('-s, --strict', 'Enable strict validation')
		.option('--fix', 'Attempt to fix common issues (not implemented)')
		.action((file: string, options: ValidateOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				const errors: string[] = [];
				const warnings: string[] = [];

				// Get GEDCOM version
				const header = tree.HEAD;
				const version = header?.GEDC?.VERS?.value || 'Unknown';

				// Basic validation checks
				const individuals = tree.indis();
				const families = tree.fams();

				// Check for individuals without names
				let missingNames = 0;
				individuals.forEach(indi => {
					if (!indi.NAME?.toValue()) {
						missingNames++;
						warnings.push(`Individual ${indi.id} is missing a name`);
					}
				});

				// Check for individuals without birth dates
				let missingBirthDates = 0;
				individuals.forEach(indi => {
					if (!indi.BIRT?.DATE?.toValue()) {
						missingBirthDates++;
					}
				});

				// Check for individuals without death dates (but marked as deceased)
				let missingDeathDates = 0;
				individuals.forEach(indi => {
					if (indi.DEAT && !indi.DEAT.DATE?.toValue()) {
						missingDeathDates++;
					}
				});

				// Check for duplicate IDs
				const seenIds = new Set<string>();
				const duplicateIds: string[] = [];
				const checkDuplicates = (item: any) => {
					if (seenIds.has(item.id)) {
						duplicateIds.push(item.id);
						errors.push(`Duplicate ID found: ${item.id}`);
					}
					seenIds.add(item.id);
				};
				
				individuals.forEach(checkDuplicates);
				families.forEach(checkDuplicates);

				// Check for missing family members
				families.forEach(fam => {
					const husb = fam.HUSB?.value;
					const wife = fam.WIFE?.value;
					
					if (!husb && !wife) {
						warnings.push(`Family ${fam.id} has no husband or wife`);
					}
					
					if (husb && !tree.indi(husb)) {
						errors.push(`Family ${fam.id} references non-existent husband ${husb}`);
					}
					
					if (wife && !tree.indi(wife)) {
						errors.push(`Family ${fam.id} references non-existent wife ${wife}`);
					}
				});

				// Check for invalid date formats (basic check)
				individuals.forEach(indi => {
					const birthDate = indi.BIRT?.DATE?.toValue();
					const deathDate = indi.DEAT?.DATE?.toValue();
					
					if (birthDate && birthDate.includes('INVALID')) {
						errors.push(`Invalid birth date format for ${indi.id}`);
					}
					
					if (deathDate && deathDate.includes('INVALID')) {
						errors.push(`Invalid death date format for ${indi.id}`);
					}
				});

				const result: ValidationResult = {
					valid: errors.length === 0,
					version,
					errors,
					warnings,
				};

				if (options.json) {
					console.log(formatJson(result));
				} else {
					if (result.valid) {
						console.log(formatSuccess(`Valid GEDCOM ${version} file`));
					} else {
						console.log(formatError(`Invalid GEDCOM file - ${errors.length} error(s) found`));
					}

					console.log();
					console.log(formatHeader('Validation Summary'));
					console.log(`${formatError('Errors:')} ${formatCount(errors.length)}`);
					console.log(`${formatWarning('Warnings:')} ${formatCount(warnings.length)}`);

					if (errors.length > 0) {
						console.log();
						console.log(formatHeader('Errors'));
						errors.slice(0, 10).forEach(error => {
							console.log(formatListItem(formatError(error)));
						});
						if (errors.length > 10) {
							console.log(formatListItem(`... and ${errors.length - 10} more errors`));
						}
					}

					if (warnings.length > 0) {
						console.log();
						console.log(formatHeader('Warnings'));
						
						// Summarize warnings
						if (missingBirthDates > 0) {
							console.log(formatListItem(formatWarning(`Missing birth dates: ${missingBirthDates} individuals`)));
						}
						if (missingDeathDates > 0) {
							console.log(formatListItem(formatWarning(`Missing death dates: ${missingDeathDates} individuals`)));
						}
						if (duplicateIds.length > 0) {
							console.log(formatListItem(formatWarning(`Duplicate IDs: ${duplicateIds.length}`)));
						}
						
						// Show first few specific warnings
						const otherWarnings = warnings.filter(w => !w.includes('birth') && !w.includes('death'));
						otherWarnings.slice(0, 5).forEach(warning => {
							console.log(formatListItem(formatWarning(warning)));
						});
						if (otherWarnings.length > 5) {
							console.log(formatListItem(`... and ${otherWarnings.length - 5} more warnings`));
						}
					}

					if (options.fix) {
						console.log();
						console.log(formatWarning('Fix option is not yet implemented'));
					}
				}

				// Exit with error code if validation failed
				if (!result.valid) {
					process.exit(1);
				}
			} catch (error) {
				handleError(error, 'Failed to validate GEDCOM file');
			}
		});
}
