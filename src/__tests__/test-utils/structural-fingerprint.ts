/**
 * Semantic fingerprint helpers kept for ad-hoc debugging only.
 * Strict parity tests compare full toObject / toGedcom — do not skip fields.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Full leaf dump of a persist/toObject tree (no skips). */
export const structuralFingerprint = (
	data: Record<string, unknown>
): string[] => {
	const out: string[] = [];

	const walk = (node: unknown, path: string) => {
		if (node === null || node === undefined) {
			return;
		}
		if (
			typeof node === "string" ||
			typeof node === "number" ||
			typeof node === "boolean"
		) {
			out.push(`${path}=${String(node)}`);
			return;
		}
		if (Array.isArray(node)) {
			node.forEach((item, index) => walk(item, `${path}[${index}]`));
			return;
		}
		if (isPlainObject(node)) {
			for (const key of Object.keys(node).sort()) {
				walk(node[key], path ? `${path}.${key}` : key);
			}
		}
	};

	walk(data, "");
	return out.sort();
};

export const fingerprintDiff = (
	before: string[],
	after: string[]
): { missing: string[]; extra: string[] } => {
	const afterSet = new Set(after);
	const beforeSet = new Set(before);
	return {
		missing: before.filter((line) => !afterSet.has(line)),
		extra: after.filter((line) => !beforeSet.has(line)),
	};
};
