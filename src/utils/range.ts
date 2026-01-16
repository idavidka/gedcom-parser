export type PrimitiveRange =
	| ""
	| "-"
	| `-${number}`
	| `${number}-`
	| `${number}-${number}`;
export type RangeTuple =
	| PrimitiveRange
	| [(string | number)?, (string | number)?]
	| [string | number, (string | number)?];
export interface SplitResult {
	range: PrimitiveRange;
	to?: boolean;
	by?: boolean;
}

const toTuple = (r: RangeTuple): [number | undefined, number | undefined] => {
	if (Array.isArray(r)) {
		const [s, e] = r;
		return [
			s === undefined ? undefined : Number(s),
			e === undefined ? undefined : Number(e),
		];
	}
	if (r === "-" || r === "") return [undefined, undefined];
	const [s, e] = r.split("-");
	return [s ? Number(s) : undefined, e ? Number(e) : undefined];
};

export const fromTuple = (s?: number, e?: number): PrimitiveRange => {
	if (s === undefined && e === undefined) return "-";
	if (s === undefined) return `-${e}` as PrimitiveRange;
	if (e === undefined) return `${s}-` as PrimitiveRange;
	return `${s}-${e}` as PrimitiveRange;
};

const isValidRange = (range: RangeTuple) => {
	if (
		!Array.isArray(range) &&
		range !== "" &&
		range !== "-" &&
		!/^\d*-\d*$/.test(range)
	) {
		return false;
	}

	if (
		Array.isArray(range) &&
		range.some((r) => typeof r === "string" && isNaN(Number(r)))
	) {
		return false;
	}

	return true;
};

export const inRange = (
	year: string | number | undefined,
	range: RangeTuple,
	trueIfNoYear = false
) => {
	if (!isValidRange(range)) {
		return false;
	}

	if (!year) {
		return trueIfNoYear;
	}

	const [start = -Infinity, end = Infinity] = toTuple(range);

	if (!start && !end) {
		return true;
	}

	if (start && !end) {
		return Number(year) >= Number(start);
	}

	if (!start && end) {
		return Number(year) <= Number(end);
	}

	return Number(start) <= Number(year) && Number(year) <= Number(end);
};

export const isIntersectedRange = (range1: RangeTuple, range2: RangeTuple) => {
	if (!isValidRange(range1) || !isValidRange(range2)) {
		return false;
	}

	const [start1 = -Infinity, end1 = Infinity] = toTuple(range1);
	const [start2 = -Infinity, end2 = Infinity] = toTuple(range2);

	if (!start1 && !end1) {
		return true;
	}

	if (!start2 && !end2) {
		return true;
	}

	if (start1 && !end1) {
		if (start2 && !end2) {
			return true;
		}

		if (!start2 && end2) {
			return Number(start1) <= Number(end2);
		}

		return Number(start1) <= Number(end2);
	}

	if (!start1 && end1) {
		if (start2 && !end2) {
			return Number(start2) <= Number(end1);
		}

		if (!start2 && end2) {
			return true;
		}

		return Number(start2) <= Number(end1);
	}

	if (start1 && end1) {
		if (start2 && !end2) {
			return Number(start2) <= Number(end1);
		}

		if (!start2 && end2) {
			return Number(start1) <= Number(end2);
		}

		return Number(start1) <= Number(end2) && Number(start2) <= Number(end1);
	}

	return false;
};

export const splitRange = (to: RangeTuple, by: RangeTuple): SplitResult[] => {
	const [toStart, toEnd] = toTuple(to);
	const [byStart, byEnd] = toTuple(by);

	// Helper to build the PrimitiveRange string from optional numeric bounds
	const make = (s?: number, e?: number): PrimitiveRange => fromTuple(s, e);

	// If there is no intersection at all, return the full "to" range
	if (!isIntersectedRange(to, by)) {
		return [{ range: fromTuple(toStart, toEnd), to: true }];
	}

	// Calculate overlap boundaries between the two ranges
	const overlapStart = Math.max(toStart ?? -Infinity, byStart ?? -Infinity);
	const overlapEnd = Math.min(toEnd ?? Infinity, byEnd ?? Infinity);

	const results: SplitResult[] = [];

	// Lower segment of "to" that lies completely before the overlap
	if ((toStart ?? -Infinity) < overlapStart) {
		const loEnd = overlapStart - 1;
		results.push({
			range: make(toStart, loEnd),
			to: true,
		});
	}

	// The overlapping segment between "to" and "by"
	results.push({
		range: make(
			Number.isFinite(overlapStart) ? overlapStart : undefined,
			Number.isFinite(overlapEnd) ? overlapEnd : undefined
		),
		to: true,
		by: true,
	});

	// Upper segment of "to" that lies completely after the overlap
	if ((toEnd ?? Infinity) > overlapEnd) {
		const hiStart = overlapEnd + 1;
		results.push({
			range: make(hiStart, toEnd),
			to: true,
		});
	}

	return results;
};

// Additional range splitting utilities for complex operations

export function parseRangeBounds(
	rangeKey: PrimitiveRange
): [number | undefined, number | undefined] {
	const split = rangeKey.split("-");
	const start = split[0] ? Number(split[0]) : undefined;
	const end = split[1] ? Number(split[1]) : undefined;
	return [start, end];
}

export function isRangeContained(
	containedRange: PrimitiveRange,
	containerRange: PrimitiveRange
): boolean {
	const [containedStart, containedEnd] = parseRangeBounds(containedRange);
	const [containerStart, containerEnd] = parseRangeBounds(containerRange);

	const containedStartNum = containedStart ?? -Infinity;
	const containedEndNum = containedEnd ?? Infinity;
	const containerStartNum = containerStart ?? -Infinity;
	const containerEndNum = containerEnd ?? Infinity;

	return (
		containedStartNum >= containerStartNum &&
		containedEndNum <= containerEndNum
	);
}

export function extractSplitPoints(ranges: PrimitiveRange[]): number[] {
	const points: Set<number> = new Set();

	ranges.forEach((range) => {
		const [start, end] = parseRangeBounds(range);
		if (start !== undefined) points.add(start);
		if (end !== undefined) points.add(end + 1);
	});

	return Array.from(points).sort((a, b) => a - b);
}

export function generateSplitRanges(splitPoints: number[]): PrimitiveRange[] {
	const ranges: PrimitiveRange[] = [];

	for (let i = 0; i < splitPoints.length - 1; i++) {
		const start = splitPoints[i];
		const end = splitPoints[i + 1] - 1;
		ranges.push(fromTuple(start, end));
	}

	return ranges;
}

export function splitOverlappingRanges<T>(
	rangesToValues: Array<[PrimitiveRange, T]>
): Array<[PrimitiveRange, T[]]> {
	if (rangesToValues.length === 0) return [];

	const ranges = rangesToValues.map(([range]) => range);
	const splitPoints = extractSplitPoints(ranges);

	// Generate split ranges including open-ended ranges
	const splitRanges: PrimitiveRange[] = [];

	// Handle ranges before the first split point
	if (splitPoints.length > 0) {
		const firstPoint = splitPoints[0];
		// Check if any range covers before firstPoint
		const hasRangeBeforeFirst = ranges.some((range) => {
			const [start] = parseRangeBounds(range);
			return start === undefined || start < firstPoint;
		});
		if (hasRangeBeforeFirst) {
			splitRanges.push(fromTuple(undefined, firstPoint - 1));
		}
	}

	// Generate ranges between split points
	for (let i = 0; i < splitPoints.length - 1; i++) {
		const start = splitPoints[i];
		const end = splitPoints[i + 1] - 1;
		splitRanges.push(fromTuple(start, end));
	}

	// Handle ranges after the last split point
	if (splitPoints.length > 0) {
		const lastPoint = splitPoints[splitPoints.length - 1];
		// Check if any range covers after lastPoint
		const hasRangeAfterLast = ranges.some((range) => {
			const [, end] = parseRangeBounds(range);
			return end === undefined || end >= lastPoint;
		});
		if (hasRangeAfterLast) {
			splitRanges.push(fromTuple(lastPoint, undefined));
		}
	}

	return splitRanges
		.map((splitRange) => {
			const matchingValues: T[] = [];

			rangesToValues.forEach(([originalRange, value]) => {
				if (isRangeContained(splitRange, originalRange)) {
					matchingValues.push(value);
				}
			});

			return [splitRange, matchingValues] as [PrimitiveRange, T[]];
		})
		.filter(([, values]) => values.length > 0); // Only return ranges that have matching values
}

export function findMatchingRangeForSplitRange<T>(
	splitRange: PrimitiveRange,
	rangesToValues: Array<[PrimitiveRange, T]>
): T[] {
	const matchingValues: T[] = [];

	rangesToValues.forEach(([originalRange, value]) => {
		if (isRangeContained(splitRange, originalRange)) {
			matchingValues.push(value);
		}
	});

	return matchingValues;
}

export function extractSeparationYears(
	childName: string,
	ranges: Record<string, unknown[]>,
	parentName: string,
	ensureArray: (x: unknown) => unknown[]
): number[] {
	const separationYears: number[] = [];

	Object.entries(ranges).forEach(([rangeKey, entries]) => {
		if (rangeKey === "names" || !entries) {
			return;
		}
		const pts = entries as Array<{ town: unknown }>;

		pts.forEach((pt) => {
			const towns = ensureArray(pt.town);
			const keyDiffersFromTown = !towns.includes(childName);
			const pointsToParent = towns.includes(parentName);
			// Only consider it a parent-child relationship if town array has EXACTLY ONE entry
			const isSingleParent = towns.length === 1;

			// Check if this is a range where the child points to the parent (before separation)
			if (keyDiffersFromTown && pointsToParent && isSingleParent) {
				// The end of this range is when the child separates
				const split = (rangeKey as PrimitiveRange).split("-");
				const end = split[1] ? Number(split[1]) : undefined;
				if (typeof end === "number") {
					const separationYear = end + 1;
					if (!separationYears.includes(separationYear)) {
						separationYears.push(separationYear);
					}
				}
			}
			// Check if this is a range where the child becomes independent (after separation)
			else if (!keyDiffersFromTown && !pointsToParent) {
				const split = (rangeKey as PrimitiveRange).split("-");
				const start = split[0] ? Number(split[0]) : undefined;
				if (
					typeof start === "number" &&
					!separationYears.includes(start)
				) {
					separationYears.push(start);
				}
			}
		});
	});

	return separationYears.sort((a, b) => a - b);
}
