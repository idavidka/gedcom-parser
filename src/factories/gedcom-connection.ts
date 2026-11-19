/**
 * Default GEDCOM store connection prefix.
 * Mirrors the cache-factory pattern: the app injects `indexeddb://treeviz-gedcom`
 * via `initGedcomParser`; CLI / Cloud Functions leave the default unset so
 * short tree ids resolve only when an explicit connection is passed.
 */

let defaultConnectionPrefix: string | undefined;

/**
 * Set the default connection prefix used when callers pass a bare treeId.
 *
 * @example
 * ```ts
 * setGedcomConnection("indexeddb://treeviz-gedcom");
 * await GedcomTree.open(uniqueId); // → indexeddb://treeviz-gedcom/<uniqueId>
 * ```
 */
export const setGedcomConnection = (prefix: string | undefined) => {
	defaultConnectionPrefix = prefix?.replace(/\/$/, "") || undefined;
};

/** Current default prefix, or undefined when none was set. */
export const getGedcomConnection = (): string | undefined =>
	defaultConnectionPrefix;

/** Clear the default (tests / CLI). */
export const resetGedcomConnection = () => {
	defaultConnectionPrefix = undefined;
};
