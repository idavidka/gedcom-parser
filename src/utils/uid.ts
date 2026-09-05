/**
 * GEDCOM 7 UID (UUID) helpers.
 * Spec: each record may carry `n UID <uuid>`.
 */

export const createGedcomUid = (): string => {
	const cryptoObj =
		typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
	if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
		return cryptoObj.randomUUID();
	}

	// RFC4122-ish fallback when randomUUID is unavailable.
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const rand = (Math.random() * 16) | 0;
		const value = char === "x" ? rand : (rand & 0x3) | 0x8;
		return value.toString(16);
	});
};
