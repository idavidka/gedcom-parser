/**
 * Nested group utility stub for gedcom-parser
 * This is a minimal implementation
 */

export const setNestedGroup = <T>(
	obj: Record<string, T>,
	keys: string | (string | undefined)[],
	value: T,
	_uniqueCounting?: boolean // Ignored in this minimal impl
): Record<string, T> => {
	const keyArray = typeof keys === "string" ? [keys] : keys;
	const validKeys = keyArray.filter((k): k is string => Boolean(k));

	if (validKeys.length === 0) {
		return obj;
	}

	const key = validKeys.join(" / ");
	obj[key] = value;

	return obj;
};
