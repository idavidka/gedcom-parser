import type { IndiType } from "../classes/indi";
import KinshipTranslator from "../kinship-translator/kinship-translator";
import type { Language } from "../kinship-translator/types";
import type { IndiKey } from "../types/types";

/**
 * Kinship translator class constructor type
 */
export type KinshipTranslatorConstructor = new (
	person1: IndiType,
	person2?: IndiType | IndiKey,
	lang?: Language,
	entirePath?: boolean,
	displayName?: "none" | "givenname" | "surname" | "all"
) => {
	translate: <T extends boolean | undefined>(
		showMainPerson: boolean
	) =>
		| (T extends false | undefined
				? string
				: Array<{
						id?: IndiKey;
						gen: number;
						relative?: string;
						absolute?: string;
					}>)
		| undefined;
};

/**
 * Default kinship translator (uses the built-in translator)
 */
let KinshipTranslatorClass: KinshipTranslatorConstructor =
	KinshipTranslator as unknown as KinshipTranslatorConstructor;

/**
 * Set a custom kinship translator class.
 * This allows the main project or external projects to override the kinship translation logic.
 *
 * @example
 * ```typescript
 * import { setKinshipTranslatorClass } from '@treeviz/gedcom-parser/factories/kinship-factory';
 * import MyCustomKinshipTranslator from './my-custom-kinship-translator';
 *
 * setKinshipTranslatorClass(MyCustomKinshipTranslator);
 * ```
 */
export const setKinshipTranslatorClass = (
	TranslatorClass: KinshipTranslatorConstructor
) => {
	KinshipTranslatorClass = TranslatorClass;
};

/**
 * Get the current kinship translator class.
 * Used internally by the Indi class.
 */
export const getKinshipTranslatorClass = (): KinshipTranslatorConstructor => {
	return KinshipTranslatorClass;
};

/**
 * Reset to the default built-in kinship translator.
 * Useful for testing or when switching between projects.
 */
export const resetKinshipTranslatorClass = () => {
	KinshipTranslatorClass =
		KinshipTranslator as unknown as KinshipTranslatorConstructor;
};
