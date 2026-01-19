import { readFileSync } from 'fs';
import { formatError } from './formatters';

/**
 * Read a GEDCOM file
 */
export function readGedcomFile(filePath: string): string {
	try {
		return readFileSync(filePath, 'utf-8');
	} catch (error) {
		if (error instanceof Error) {
			console.error(formatError(`Failed to read file: ${error.message}`));
		} else {
			console.error(formatError('Failed to read file'));
		}
		process.exit(1);
	}
}

/**
 * Handle CLI errors
 */
export function handleError(error: unknown, context?: string): never {
	const contextMsg = context ? `${context}: ` : '';
	
	if (error instanceof Error) {
		console.error(formatError(`${contextMsg}${error.message}`));
	} else {
		console.error(formatError(`${contextMsg}An unknown error occurred`));
	}
	
	process.exit(1);
}

/**
 * Validate file path
 */
export function validateFilePath(filePath: string | undefined, paramName: string): string {
	if (!filePath) {
		console.error(formatError(`${paramName} is required`));
		process.exit(1);
	}
	return filePath;
}

/**
 * Clean GEDCOM name by removing slashes
 */
export function cleanGedcomName(name: string | undefined | null): string {
	if (!name) return '';
	return name.replace(/\//g, '').trim();
}

/**
 * Format lifespan string
 */
export function formatLifespan(birthDate: string | null | undefined, deathDate: string | null | undefined): string {
	const birth = birthDate || '?';
	const death = deathDate || '?';
	return `(${birth} - ${death})`;
}
