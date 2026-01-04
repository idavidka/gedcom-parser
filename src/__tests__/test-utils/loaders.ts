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
 * Loads a text file from the filesystem relative to the package root.
 * Useful for loading GEDCOM test fixtures.
 *
 * @param filePath - Path relative to the base directory (e.g., "src/__tests__/mocks/mock.ged")
 * @param baseDir - Optional base directory. If not provided, uses the package root.
 * @returns File contents as string
 *
 * @example
 * ```typescript
 * // Uses gedcom-parser package root
 * const gedcomContent = textFileLoader("src/__tests__/mocks/mock.ged");
 * 
 * // Uses custom base directory
 * const gedcomContent = textFileLoader("src/__tests__/mocks/mock.ged", "/custom/path");
 * ```
 */
export const textFileLoader = (filePath: string, baseDir?: string): string => {
	const root = baseDir || packageRoot;
	return fs.readFileSync(path.join(root, filePath)).toString();
};
