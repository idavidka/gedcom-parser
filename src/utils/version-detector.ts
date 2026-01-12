/**
 * Utility functions for detecting GEDCOM version
 */

/**
 * Detects the GEDCOM version from the content
 * @param content - GEDCOM file content as string
 * @returns The detected version (5 or 7), or undefined if not found
 */
export function detectGedcomVersion(content: string): 5 | 7 | undefined {
	// Look for the version line in the GEDC structure
	// Format: "2 VERS <version>" under "1 GEDC" under "0 HEAD"
	const versionMatch = content.match(/1\s+GEDC[^\n]*\n[^\n]*2\s+VERS\s+(\S+)/i);
	
	if (!versionMatch || !versionMatch[1]) {
		return undefined;
	}
	
	const versionString = versionMatch[1];
	
	// Check if it's GEDCOM 7.x
	if (versionString.startsWith('7')) {
		return 7;
	}
	
	// Default to GEDCOM 5 for any other version (5.x, etc.)
	return 5;
}
