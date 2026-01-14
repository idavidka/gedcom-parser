import { writeFileSync } from 'fs';
import type { Command } from 'commander';
import { mergeGedcoms } from '../../classes/gedcom.js';
import type { MultiTag } from '../../types/types.js';
import GedcomTree from '../../utils/parser.js';
import { formatSuccess } from '../utils/formatters.js';
import { readGedcomFile, handleError } from '../utils/helpers.js';

interface MergeOptions {
	output: string;
	dedupe?: boolean;
	strategy?: string;
}

/**
 * Helper to get and validate the merge strategy
 */
function getMergeStrategy(options: MergeOptions): MultiTag | 'id' {
	if (options.dedupe) {
		console.warn('Warning: --dedupe option is deprecated. Use --strategy NAME instead.');
		return 'NAME';
	}
	return (options.strategy || 'id') as MultiTag | 'id';
}

export function registerMergeCommand(program: Command): void {
	program
		.command('merge <files...>')
		.description('Merge multiple GEDCOM files')
		.requiredOption('-o, --output <file>', 'Output file path (required)')
		.option('--dedupe', 'Attempt to detect and merge duplicates (deprecated, use --strategy NAME)')
		.option(
			'--strategy <strategy>',
			'Matching strategy: "id" (match by ID) or a tag like "NAME" (match by name). Default: "id"',
			'id'
		)
		.action((files: string[], options: MergeOptions) => {
			try {
				if (files.length < 2) {
					console.error('At least 2 files are required for merging');
					process.exit(1);
				}

				// For 2 files, use the new mergeGedcoms function
				if (files.length === 2) {
					const targetContent = readGedcomFile(files[0]);
					const sourceContent = readGedcomFile(files[1]);

					const { gedcom: targetGedcom } = GedcomTree.parse(targetContent);
					const { gedcom: sourceGedcom } = GedcomTree.parse(sourceContent);

					const strategy = getMergeStrategy(options);
					const merged = mergeGedcoms(targetGedcom, sourceGedcom, strategy);

					const mergedContent = merged.toGedcom();
					writeFileSync(options.output, mergedContent, 'utf-8');

					console.log(
						formatSuccess(
							`Merged 2 files using strategy "${strategy}" (${merged.indis()?.length} individuals, ${merged.fams()?.length} families) into ${options.output}`
						)
					);
					return;
				}

				// For more than 2 files, use iterative merging
				console.log(`Merging ${files.length} files iteratively...`);
				
				const targetContent = readGedcomFile(files[0]);
				let { gedcom: targetGedcom } = GedcomTree.parse(targetContent);

				const strategy = getMergeStrategy(options);
				for (let i = 1; i < files.length; i++) {
					const sourceContent = readGedcomFile(files[i]);
					const { gedcom: sourceGedcom } = GedcomTree.parse(sourceContent);

					targetGedcom = mergeGedcoms(targetGedcom, sourceGedcom, strategy);
					
					console.log(`  Merged file ${i + 1}/${files.length}: ${files[i]}`);
				}

				const mergedContent = targetGedcom.toGedcom();
				writeFileSync(options.output, mergedContent, 'utf-8');

				console.log(
					formatSuccess(
						`Merged ${files.length} files (${targetGedcom.indis()?.length} individuals, ${targetGedcom.fams()?.length} families) into ${options.output}`
					)
				);
			} catch (error) {
				handleError(error, 'Failed to merge GEDCOM files');
			}
		});
}
