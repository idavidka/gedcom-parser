import type { IndiType } from "../classes/indi";
import type { MultiTag } from "../types/types";

export const getAllProp = <T>(indi?: IndiType, prop?: MultiTag) => {
	return ((prop &&
		(indi?.get(prop)?.toList().values() ?? []).filter(Boolean)) ||
		[]) as T[];
};
