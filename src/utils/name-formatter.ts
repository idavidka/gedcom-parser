import { Indi, type IndiType } from "../classes/indi";
import { createCommonName, type CommonName } from "../classes/name";
import type { Settings } from "../types/settings";

export const nameFormatter = (
	indiName?: IndiType | string,
	settings?: Partial<Settings>,
	letterOnAll = true,
	indi?: IndiType,
	debug?: 3
) => {
	const {
		nameOrder = "first-last",
		maxGivennames = 0,
		maxSurnames = 0,
	} = settings ?? {};
	const rawName =
		indiName instanceof Indi
			? indiName?.NAME
			: createCommonName(undefined, undefined, indi).name(indiName);
	const name = rawName?.toList().index(0) as CommonName | undefined;
	let givenname = name?.GIVN?.toValueList().first()?.value || "";
	let surname = name?.SURN?.toValueList().first()?.value || "";
	let suffix = name?.NSFX?.toValueList().first()?.value || "";
	const displayedName = name?.DISPLAY?.toValueList().first()?.value || "";

	if (!givenname && !surname) {
		givenname = displayedName;
	}

	if (maxGivennames > 0) {
		givenname = givenname.split(" ").slice(0, maxGivennames).join(" ");
	}
	if (maxSurnames > 0) {
		surname = surname.split(" ").slice(0, maxSurnames).join(" ");
	}

	if (debug) {
		suffix = suffix || "Dr";
		for (let i = 1; i < debug; i++) {
			givenname = `${givenname} ${givenname}`;
			surname = `${surname} ${surname}`;
		}
	}

	const inOrder = [
		suffix,
		...(nameOrder === "last-first"
			? [surname, givenname]
			: [givenname, surname]),
	] as [string, string, string];

	const lName = (
		letterOnAll
			? [inOrder[1], inOrder[2]].filter(Boolean).join(" ")
			: inOrder[1]
	).toLowerCase();
	const firstLetter =
		lName.match(/^(dzs|cs|dz|gy|ly|ny|sz|ty|zs|\w)/i)?.[0] ??
		lName.substring(0, 1) ??
		"";
	const validFirstLetter = `${firstLetter
		.substring(0, 1)
		.toUpperCase()}${firstLetter.substring(1)}`;

	return { suffix, givenname, surname, inOrder, letter: validFirstLetter };
};
