import { type FamType } from "../classes/fam";
import { type IndiType } from "../classes/indi";
import { type IndiKey } from "../types/types";

export const getFamilyWith = (
	person1: IndiType,
	person2?: IndiKey,
	famType: "FAMS" | "FAMC" = "FAMS"
) => {
	return person1
		?.get(famType)
		?.toValueList()
		.find((fam) => {
			const family = fam as FamType | undefined;
			return (
				famType === "FAMC" ||
				family?.HUSB?.value === person2 ||
				family?.WIFE?.value === person2
			);
		}) as FamType | undefined;
};
