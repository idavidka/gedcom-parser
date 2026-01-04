import { idGetter } from "../../classes";
import type { IndiKey } from "../../types/types";

/**
 * Creates a person ID getter function for test purposes
 * @param persons - Record mapping person keys to IndiKey values
 * @returns Function that retrieves the ID for a given person key
 */
export const createPersonIdGetter = <T extends string>(
	persons: Record<T, IndiKey>
) => {
	return (person: T): IndiKey => {
		return idGetter(persons[person] as IndiKey)!;
	};
};
