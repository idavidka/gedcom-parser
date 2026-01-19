import type { Command } from 'commander';
import GedcomTree from '../../utils/parser';
import {
	formatHeader,
	formatLabel,
	formatValue,
	formatListItem,
	formatJson,
	formatId,
	formatName,
	formatDate,
	formatPlace,
	formatError,
} from '../utils/formatters';
import { readGedcomFile, handleError, cleanGedcomName, formatLifespan } from '../utils/helpers';

interface ShowOptions {
	json?: boolean;
	format?: 'text' | 'json' | 'markdown';
	includeEvents?: boolean;
	includeSources?: boolean;
}

export function registerShowCommand(program: Command): void {
	program
		.command('show <file> <id>')
		.description('Display detailed information about an individual')
		.option('-j, --json', 'Output in JSON format')
		.option('-f, --format <format>', 'Output format: text, json, markdown', 'text')
		.option('--include-events', 'Include all life events')
		.option('--include-sources', 'Include sources')
		.action((file: string, id: string, options: ShowOptions) => {
			try {
				const content = readGedcomFile(file);
				const { gedcom: tree } = GedcomTree.parse(content);

				const individual = tree.indi(id);

				if (!individual) {
					console.error(formatError(`Individual ${id} not found`));
					process.exit(1);
				}

				const name = cleanGedcomName(individual.NAME?.toValue());
				const birthDate = individual.BIRT?.DATE?.toValue();
				const birthPlace = individual.BIRT?.PLAC?.value;
				const deathDate = individual.DEAT?.DATE?.toValue();
				const deathPlace = individual.DEAT?.PLAC?.value;
				const sex = individual.SEX?.value;

				// Get parents
				const parents = individual.getParents();
				const father = parents?.find(p => p.SEX?.value === 'M');
				const mother = parents?.find(p => p.SEX?.value === 'F');

				// Get spouses
				const spouses = individual.getSpouses();

				// Get children
				const children = individual.getChildren();

				if (options.json || options.format === 'json') {
					const jsonData = {
						id: individual.id,
						name,
						sex,
						birth: {
							date: birthDate || null,
							place: birthPlace || null,
						},
						death: {
							date: deathDate || null,
							place: deathPlace || null,
						},
						parents: {
							father: father ? {
								id: father.id,
								name: cleanGedcomName(father.NAME?.toValue()),
							} : null,
							mother: mother ? {
								id: mother.id,
								name: cleanGedcomName(mother.NAME?.toValue()),
							} : null,
						},
						spouses: spouses.map(spouse => ({
							id: spouse.id,
							name: cleanGedcomName(spouse.NAME?.toValue()),
							birthDate: spouse.BIRT?.DATE?.toValue() || null,
							deathDate: spouse.DEAT?.DATE?.toValue() || null,
						})),
						children: children.map(child => ({
							id: child.id,
							name: cleanGedcomName(child.NAME?.toValue()),
							birthDate: child.BIRT?.DATE?.toValue() || null,
							deathDate: child.DEAT?.DATE?.toValue() || null,
						})),
					};
					console.log(formatJson(jsonData));
				} else if (options.format === 'markdown') {
					console.log(`# ${formatId(individual.id)} ${name}\n`);
					
					if (birthDate || birthPlace) {
						console.log(`**Born:** ${birthDate || '?'}`);
						if (birthPlace) console.log(`  in ${birthPlace}`);
						console.log();
					}
					
					if (deathDate || deathPlace) {
						console.log(`**Died:** ${deathDate || '?'}`);
						if (deathPlace) console.log(`  in ${deathPlace}`);
						console.log();
					}

					if (father || mother) {
						console.log('## Parents\n');
						if (father) {
							const fatherName = cleanGedcomName(father.NAME?.toValue());
							const fatherLifespan = formatLifespan(
								father.BIRT?.DATE?.toValue(),
								father.DEAT?.DATE?.toValue()
							);
							console.log(`- **Father:** ${father.id} ${fatherName} ${fatherLifespan}`);
						}
						if (mother) {
							const motherName = cleanGedcomName(mother.NAME?.toValue());
							const motherLifespan = formatLifespan(
								mother.BIRT?.DATE?.toValue(),
								mother.DEAT?.DATE?.toValue()
							);
							console.log(`- **Mother:** ${mother.id} ${motherName} ${motherLifespan}`);
						}
						console.log();
					}

					if (spouses.length > 0) {
						console.log('## Spouses\n');
						spouses.forEach(spouse => {
							const spouseName = cleanGedcomName(spouse.NAME?.toValue());
							const spouseLifespan = formatLifespan(
								spouse.BIRT?.DATE?.toValue(),
								spouse.DEAT?.DATE?.toValue()
							);
							console.log(`- ${spouse.id} ${spouseName} ${spouseLifespan}`);
						});
						console.log();
					}

					if (children.length > 0) {
						console.log('## Children\n');
						children.forEach(child => {
							const childName = cleanGedcomName(child.NAME?.toValue());
							const childLifespan = formatLifespan(
								child.BIRT?.DATE?.toValue(),
								child.DEAT?.DATE?.toValue()
							);
							console.log(`- ${child.id} ${childName} ${childLifespan}`);
						});
						console.log();
					}
				} else {
					// Text format (default)
					console.log(formatHeader(`${formatId(individual.id)} ${formatName(name)}\n`));
					
					if (sex) {
						console.log(`${formatLabel('Sex')} ${formatValue(sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : sex)}`);
					}
					
					if (birthDate || birthPlace) {
						console.log(`${formatLabel('Born')} ${formatDate(birthDate)}`);
						if (birthPlace) {
							console.log(`${formatLabel('Birth Place')} ${formatPlace(birthPlace)}`);
						}
					}
					
					if (deathDate || deathPlace) {
						console.log(`${formatLabel('Died')} ${formatDate(deathDate)}`);
						if (deathPlace) {
							console.log(`${formatLabel('Death Place')} ${formatPlace(deathPlace)}`);
						}
					}

					if (father || mother) {
						console.log();
						console.log(formatHeader('Parents'));
						if (father) {
							const fatherName = cleanGedcomName(father.NAME?.toValue());
							const fatherLifespan = formatLifespan(
								father.BIRT?.DATE?.toValue(),
								father.DEAT?.DATE?.toValue()
							);
							console.log(formatListItem(`${formatLabel('Father')} ${formatId(father.id)} ${formatName(fatherName)} ${fatherLifespan}`));
						}
						if (mother) {
							const motherName = cleanGedcomName(mother.NAME?.toValue());
							const motherLifespan = formatLifespan(
								mother.BIRT?.DATE?.toValue(),
								mother.DEAT?.DATE?.toValue()
							);
							console.log(formatListItem(`${formatLabel('Mother')} ${formatId(mother.id)} ${formatName(motherName)} ${motherLifespan}`));
						}
					}

					if (spouses.length > 0) {
						console.log();
						console.log(formatHeader('Spouses'));
						spouses.forEach(spouse => {
							const spouseName = cleanGedcomName(spouse.NAME?.toValue());
							const spouseLifespan = formatLifespan(
								spouse.BIRT?.DATE?.toValue(),
								spouse.DEAT?.DATE?.toValue()
							);
							console.log(formatListItem(`${formatId(spouse.id)} ${formatName(spouseName)} ${spouseLifespan}`));
						});
					}

					if (children.length > 0) {
						console.log();
						console.log(formatHeader('Children'));
						children.forEach(child => {
							const childName = cleanGedcomName(child.NAME?.toValue());
							const childLifespan = formatLifespan(
								child.BIRT?.DATE?.toValue(),
								child.DEAT?.DATE?.toValue()
							);
							console.log(formatListItem(`${formatId(child.id)} ${formatName(childName)} ${childLifespan}`));
						});
					}
				}
			} catch (error) {
				handleError(error, 'Failed to show individual details');
			}
		});
}
