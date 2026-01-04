import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import path from "path";
import { findPackageRoot } from "./path-utils";

// Get the directory of this file (src/__tests__/test-utils/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The package root directory (where package.json is located)
const packageRoot = findPackageRoot(__dirname);

/**
 * Configuration for snapshot updates
 * Set UPDATE_SNAPSHOTS=true in environment to enable snapshot updates
 */
const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === "true";

/**
 * Utility to conditionally write snapshot files during test development.
 * This replaces the pattern of commented-out fs.writeFileSync calls in tests.
 *
 * Usage:
 * ```typescript
 * import { maybeUpdateSnapshot } from "./test-utils/snapshot-helpers";
 *
 * const gedcomString = gedcom.toGedcom();
 * maybeUpdateSnapshot("export.ged", gedcomString);
 * expect(gedcomString).toEqual(expectedOutput);
 * ```
 *
 * To update snapshots, run tests with UPDATE_SNAPSHOTS=true:
 * ```bash
 * UPDATE_SNAPSHOTS=true npm test
 * ```
 *
 * @param fileName - Name of the snapshot file (relative to mocks directory)
 * @param content - Content to write to the snapshot file
 * @param options - Optional configuration
 * @param options.mocksDir - Custom mocks directory (defaults to src/__tests__/mocks)
 * @param options.format - Format the JSON content (only applies to objects)
 * @param options.spaces - Number of spaces for JSON formatting (default: 4)
 * @param options.baseDir - Optional base directory. If not provided, uses the package root.
 */
export function maybeUpdateSnapshot(
	fileName: string,
	content: string | object | undefined,
	options: {
		mocksDir?: string;
		format?: boolean;
		spaces?: number;
		force?: boolean;
		baseDir?: string;
	} = {}
): void {
	if ((!UPDATE_SNAPSHOTS && !options.force) || content === undefined) {
		return;
	}

	const {
		mocksDir = "src/__tests__/mocks",
		format = false,
		spaces = 4,
		baseDir,
	} = options;

	const root = baseDir || packageRoot;
	const filePath = path.join(root, mocksDir, fileName);

	// Ensure directory exists
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	let contentToWrite: string;

	if (typeof content === "string") {
		contentToWrite = content;
	} else if (format) {
		contentToWrite = JSON.stringify(content, null, spaces);
	} else {
		contentToWrite = JSON.stringify(content);
	}

	fs.writeFileSync(filePath, contentToWrite);

	// eslint-disable-next-line no-console
	console.log(`✓ Updated snapshot: ${fileName}`);
}

/**
 * Convenience function for updating JSON snapshots with formatting
 *
 * @param fileName - Name of the JSON snapshot file
 * @param content - Object to serialize to JSON
 * @param options - Optional configuration
 */
export function maybeUpdateJsonSnapshot(
	fileName: string,
	content: object | undefined,
	options: {
		mocksDir?: string;
		spaces?: number;
		force?: boolean;
		baseDir?: string;
	} = {}
): void {
	maybeUpdateSnapshot(fileName, content, { ...options, format: true });
}

/**
 * Check if snapshot updates are enabled
 * Useful for conditional test behavior
 */
export function isSnapshotUpdateEnabled(): boolean {
	return UPDATE_SNAPSHOTS;
}
