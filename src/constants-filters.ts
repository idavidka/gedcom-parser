/**
 * Filters stub for GEDCOM parser
 * These are placeholder filters that can be overridden by the host application
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const defaultFilter = (..._args: any[]): boolean => true;

// Export all common filter names as defaultFilter
export const ALL = defaultFilter;
export const NONE = defaultFilter;
export const BIRTH = defaultFilter;
export const DEATH = defaultFilter;
export const MARRIAGE = defaultFilter;
export const LIVING = defaultFilter;
export const DECEASED = defaultFilter;
