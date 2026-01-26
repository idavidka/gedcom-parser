import chalk from "chalk";

// Re-export chalk for use in other modules
export { chalk };

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
	return chalk.green(`✓ ${message}`);
}

/**
 * Format a warning message
 */
export function formatWarning(message: string): string {
	return chalk.yellow(`⚠ ${message}`);
}

/**
 * Format an error message
 */
export function formatError(message: string): string {
	return chalk.red(`✗ ${message}`);
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
	return chalk.blue(`ℹ ${message}`);
}

/**
 * Format a header
 */
export function formatHeader(text: string): string {
	return chalk.bold.underline(text);
}

/**
 * Format a field label
 */
export function formatLabel(label: string): string {
	return chalk.cyan(`${label}:`);
}

/**
 * Format a value
 */
export function formatValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) {
		return chalk.gray("(none)");
	}
	return chalk.white(String(value));
}

/**
 * Format an ID
 */
export function formatId(id: string): string {
	return chalk.magenta(id);
}

/**
 * Format a count
 */
export function formatCount(count: number): string {
	return chalk.yellow(count.toLocaleString());
}

/**
 * Format a date
 */
export function formatDate(date: string | null | undefined): string {
	if (!date) {
		return chalk.gray("(unknown)");
	}
	return chalk.white(date);
}

/**
 * Format a place
 */
export function formatPlace(place: string | null | undefined): string {
	if (!place) {
		return chalk.gray("(unknown)");
	}
	return chalk.white(place);
}

/**
 * Format a name
 */
export function formatName(name: string | null | undefined): string {
	if (!name) {
		return chalk.gray("(unnamed)");
	}
	// Remove GEDCOM slashes from surname
	const cleanName = name.replace(/\//g, "");
	return chalk.white(cleanName);
}

/**
 * Format a list item
 */
export function formatListItem(text: string, indent: number = 0): string {
	const indentation = "  ".repeat(indent);
	return `${indentation}- ${text}`;
}

/**
 * Format a table row
 */
export function formatTableRow(columns: string[], widths: number[]): string {
	return columns.map((col, i) => col.padEnd(widths[i])).join("  ");
}

/**
 * Format a table separator
 */
export function formatTableSeparator(widths: number[]): string {
	return widths.map((width) => "-".repeat(width)).join("  ");
}

/**
 * Pretty print JSON
 */
export function formatJson(data: unknown): string {
	return JSON.stringify(data, null, 2);
}

/**
 * Format a progress indicator
 */
export function formatProgress(current: number, total: number): string {
	const percentage = Math.round((current / total) * 100);
	const bar = "█".repeat(Math.floor(percentage / 5));
	const empty = "░".repeat(20 - Math.floor(percentage / 5));
	return chalk.cyan(`[${bar}${empty}] ${percentage}%`);
}
