#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { registerInfoCommand } from './commands/info.js';
import { registerFindCommand } from './commands/find.js';
import { registerShowCommand } from './commands/show.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerRelativesCommand } from './commands/relatives.js';
import { registerExtractCommand } from './commands/extract.js';
import { registerStatsCommand } from './commands/stats.js';
import { registerMergeCommand } from './commands/merge.js';
import { registerConvertCommand } from './commands/convert.js';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
	.name('gedcom-parser')
	.description('CLI tool for parsing and manipulating GEDCOM files')
	.version(packageJson.version);

// Register all commands
registerInfoCommand(program);
registerFindCommand(program);
registerShowCommand(program);
registerValidateCommand(program);
registerRelativesCommand(program);
registerExtractCommand(program);
registerStatsCommand(program);
registerMergeCommand(program);
registerConvertCommand(program);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
	program.outputHelp();
}
