import type { IndiType } from "../classes/indi";

import type { CrossCases, CrossCase } from "./types";

/**
 * A string is the same in both directions (mostoha apa / mostoha gyermek).
 * A directed pair flips with the link: the ancestor is the one who raises
 * or adopts (nevelő, örökbefogadó); everyone else was raised or adopted
 * (nevelt, örökbefogadott).
 */
export type ParentRelationLabel =
	| string
	| { ancestor: string; other: string };

export const parentRelationsHu: Record<string, ParentRelationLabel> = {
	step: "mostoha",
	foster: { ancestor: "nevelő", other: "nevelt" },
	birth: "vérszerinti",
	biological: "vérszerinti",
	adopted: { ancestor: "örökbefogadó", other: "örökbefogadott" },
};

export const parentRelationPrefix = (
	relation: string,
	ancestor: boolean
): string | undefined => {
	const label = parentRelationsHu[relation];
	if (!label) {
		return;
	}

	if (typeof label === "string") {
		return label;
	}

	return ancestor ? label.ancestor : label.other;
};

const parentRelationModifiers = [
	...new Set(
		Object.values(parentRelationsHu).flatMap((label) =>
			typeof label === "string"
				? [label]
				: [label.ancestor, label.other]
		)
	),
].join("|");

const nominativus: CrossCase = {
	apa: { nominativus: "apa", dativus: "apjának", possessivus: "apja" },
	anya: { nominativus: "anya", dativus: "anyjának", possessivus: "anyja" },
	após: { nominativus: "após", dativus: "apósának", possessivus: "apósa" },
	anyós: {
		nominativus: "anyós",
		dativus: "anyósának",
		possessivus: "anyósa",
	},
	vő: { nominativus: "vő", dativus: "vejének", possessivus: "veje" },
	meny: { nominativus: "meny", dativus: "menyének", possessivus: "menye" },
	sógor: {
		nominativus: "sógor",
		dativus: "sógorának",
		possessivus: "sógora",
	},
	sógornő: {
		nominativus: "sógornő",
		dativus: "sógornőjének",
		possessivus: "sógornője",
	},
	bácsi: {
		nominativus: "bácsi",
		dativus: "bátyjának",
		possessivus: "bátyja",
	},
	néni: { nominativus: "néni", dativus: "nénjének", possessivus: "nénje" },
	testvér: {
		nominativus: "testvér",
		dativus: "testvérének",
		possessivus: "testvére",
	},
	öcs: { nominativus: "öcs", dativus: "öccsének", possessivus: "öccse" },
	húg: { nominativus: "húg", dativus: "húgának", possessivus: "húga" },
	férj: { nominativus: "férj", dativus: "férjének", possessivus: "férje" },
	feleség: {
		nominativus: "feleség",
		dativus: "feleségének",
		possessivus: "felesége",
	},
	házastárs: {
		nominativus: "házastárs",
		dativus: "házastársának",
		possessivus: "házastársa",
	},
	unoka: {
		nominativus: "unoka",
		dativus: "unokájának",
		possessivus: "unokája",
	},
	gyermek: {
		nominativus: "gyermek",
		dativus: "gyermekének",
		possessivus: "gyermeke",
	},
	szülő: {
		nominativus: "szülő",
		dativus: "szülőjének",
		possessivus: "szülője",
	},
};

const dativus = Object.values(nominativus).reduce<CrossCase>((acc, val) => {
	acc[val.dativus] = val;

	return acc;
}, {});

const possessivus = Object.values(nominativus).reduce<CrossCase>((acc, val) => {
	acc[val.possessivus] = val;

	return acc;
}, {});

export const casesHu: CrossCases = {
	nominativus,
	dativus,
	possessivus,
};

export const InLawsHu: Record<
	string,
	string | ((indi?: IndiType) => string | undefined)
> = {
	"gyermek felesége": "meny",
	"gyermek férje": "vő",
	[`(férj|feleség) (?<mod1>(${parentRelationModifiers}) )?anyja`]: "anyós",
	[`(férj|feleség) (?<mod1>(${parentRelationModifiers}) )?apja`]: "após",
	[`(férj|feleség) (?<mod1>(${parentRelationModifiers}) )?(fél)?testvére`]: (
		indi?: IndiType
	) => {
		if (indi?.isMale()) {
			return "sógor";
		}
		if (indi?.isFemale()) {
			return "sógornő";
		}
	},
	[`(fél)?testvér férje`]: "sógor",
	[`(fél)?testvér felesége`]: "sógornő",
};
