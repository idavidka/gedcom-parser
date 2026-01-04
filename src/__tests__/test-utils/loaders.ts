import { cwd } from "process";
import fs from "fs";
import path from "path";

/**
 * Loads a text file from the filesystem (relative to current working directory).
 * Useful for loading GEDCOM test fixtures.
 *
 * @param filePath - Path relative to the current working directory
 * @returns File contents as string
 *
 * @example
 * ```typescript
 * const gedcomContent = textFileLoader("src/__tests__/mocks/sample.ged");
 * const { gedcom } = GedcomTree.parse(gedcomContent);
 * ```
 */
export const textFileLoader = (filePath: string): string => {
	return fs.readFileSync(path.resolve(`${cwd()}/${filePath}`)).toString();
};
