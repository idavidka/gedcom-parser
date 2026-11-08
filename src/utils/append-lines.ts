/**
 * Append `source` onto `target` without `push(...source)`.
 *
 * Spreading a large array into `push` passes every element as a function
 * argument. Engines cap that list (often ~65k–130k), so exporting a few
 * thousand people as GEDCOM throws `RangeError: Maximum call stack size
 * exceeded` even though recursion depth is fine.
 */
export const appendLines = (target: string[], source: string[]): void => {
	for (let i = 0; i < source.length; i++) {
		target.push(source[i]!);
	}
};
