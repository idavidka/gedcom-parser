import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import path from "path";

// Get the directory of this file (src/__tests__/test-utils/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find package root by walking up from this file's directory
function findPackageRoot(startDir: string): string {
	let currentDir = startDir;
	while (currentDir !== path.parse(currentDir).root) {
		const packagePath = path.join(currentDir, "package.json");
		if (fs.existsSync(packagePath)) {
			return currentDir;
		}
		currentDir = path.dirname(currentDir);
	}
	throw new Error("Could not find package.json");
}

// The package root directory (where package.json is located)
const packageRoot = findPackageRoot(__dirname);

/**
 * Loads a text file from the filesystem relative to the package root.
 * Useful for loading GEDCOM test fixtures.
 *
 * @param filePath - Path relative to the package root (e.g., "src/__tests__/mocks/mock.ged")
 * @returns File contents as string
 *
 * @example
 * ```typescript
 * const gedcomContent = textFileLoader("src/__tests__/mocks/mock.ged");
 * const { gedcom } = GedcomTree.parse(gedcomContent);
 * ```
 */
export const textFileLoader = (filePath: string): string => {
	return fs.readFileSync(path.join(packageRoot, filePath)).toString();
};
