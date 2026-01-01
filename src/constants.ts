/**
 * Constants for GEDCOM parser
 */

// Regular expressions for parsing
export const REF_LINE_REG =
	/^0 (?:(@[_a-zA-Z0-9]*@) )?(?<type>_[_A-Z][_a-zA-Z]{2,}|_?[A-Z][a-zA-Z]{2,}) ?(?<value>.*)/gm;
export const LINE_REG =
	/(?<indent>^[0-9]) (?:(@[_a-zA-Z0-9]*@) )?(?<type>_[_A-Z][_a-zA-Z]{2,}|_?[A-Z][a-zA-Z]{2,}) ?(?<value>.*)/;
export const ID_REG = /^@[_a-zA-Z0-9]+@/;
export const ID_GETTER_REG = /^(?<at>@)?(?<letter>[A-Z])?/i;
export const ID_SPLIT_REG = /^@[_a-zA-Z0-9]+@:/;

// Date-fns locale function (returns undefined for now - can be configured by consumer)
export const getDateFnsLocale = (): Locale | undefined => {
	// This will be undefined by default
	// Consumers of the package can override this if needed
	return undefined;
};

// Placeholder Locale type
type Locale = {
	code?: string;
	// Add more properties as needed
};
