import fs from "fs";
import path from "path";
import { cwd } from "process";

/**
 * Find the nearest package.json directory by walking up the directory tree
 * 
 * @param startDir - Directory to start searching from
 * @returns Path to the directory containing package.json
 * @throws Error if no package.json is found (fallback to cwd)
 */
export function findPackageRoot(startDir: string): string {
	let currentDir = startDir;
	while (currentDir !== path.parse(currentDir).root) {
		const packagePath = path.join(currentDir, "package.json");
		if (fs.existsSync(packagePath)) {
			return currentDir;
		}
		currentDir = path.dirname(currentDir);
	}
	// Fallback to cwd if no package.json found
	return cwd();
}
