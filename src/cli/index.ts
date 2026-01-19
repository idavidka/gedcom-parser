#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { registerConvertCommand } from './commands/convert';
import { registerExtractCommand } from './commands/extract';
import { registerFindCommand } from './commands/find';
import { registerInfoCommand } from './commands/info';
import { registerMergeCommand } from './commands/merge';
import { registerRelativesCommand } from './commands/relatives';
import { registerShowCommand } from './commands/show';
import { registerStatsCommand } from './commands/stats';
import { registerValidateCommand } from './commands/validate';

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
