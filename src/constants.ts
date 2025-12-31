/**
 * GEDCOM Parser Constants
 * Regular expressions and configuration for GEDCOM parsing
 */

// GEDCOM parsing patterns
export const REF_LINE_REG =
	/^0 (?:(@[_a-zA-Z0-9]*@) )?(?<type>_[_A-Z][_a-zA-Z]{2,}|_?[A-Z][a-zA-Z]{2,}) ?(?<value>.*)/gm;
export const LINE_REG =
	/(?<indent>^[0-9]) (?:(@[_a-zA-Z0-9]*@) )?(?<type>_[_A-Z][_a-zA-Z]{2,}|_?[A-Z][a-zA-Z]{2,}) ?(?<value>.*)/;
export const ID_REG = /^@[_a-zA-Z0-9]+@/;
export const ID_GETTER_REG = /^(?<at>@)?(?<letter>[A-Z])?/i;
export const ID_SPLIT_REG = /^@[_a-zA-Z0-9]+@:/;

// File size limits
export const MAX_FILE_SIZE_TO_SYNC = 1024 * 1024 * 20; // 20MB

// Date-fns locale fallback
// Note: The parser accepts a locale getter function via options
// This is a simple default that returns null when not provided
export const getDefaultDateFnsLocale = () => null;
export const getDateFnsLocale = getDefaultDateFnsLocale; // Alias for backward compatibility

