/**
 * Utility selectors for gedcom-parser
 */

export const getRawSize = (raw?: string) => {
	return `${raw || ""}`?.length ?? 0;
};
