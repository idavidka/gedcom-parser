/**
 * GEDCOM 7 enumeration + PHRASE helpers.
 * Spec: non-standard enumeration payloads move into a PHRASE substructure
 * with an empty (or canonical) parent payload.
 */

import type { Common } from "../classes/common";
import { createCommon } from "../classes/common";
import type { GedComType } from "../classes/gedcom";

/** Official GEDCOM 7 SEX enumeration values. */
export const GEDCOM7_SEX_VALUES = ["M", "F", "U", "X", "N"] as const;
export type Gedcom7SexValue = (typeof GEDCOM7_SEX_VALUES)[number];

/** Official GEDCOM 7 pedigree linkage values. */
export const GEDCOM7_PEDI_VALUES = [
	"adopted",
	"birth",
	"foster",
	"sealing",
] as const;
export type Gedcom7PediValue = (typeof GEDCOM7_PEDI_VALUES)[number];

/** Official GEDCOM 7 ROLE enumeration values. */
export const GEDCOM7_ROLE_VALUES = [
	"CHIL",
	"CLERGY",
	"FATH",
	"FRIEND",
	"GODP",
	"HUSB",
	"MOTH",
	"MULTIPLE",
	"NGHBR",
	"OFFICIATOR",
	"OTHER",
	"PARENT",
	"SPOU",
	"WIFE",
	"WITN",
] as const;
export type Gedcom7RoleValue = (typeof GEDCOM7_ROLE_VALUES)[number];

/** Official GEDCOM 7 RESN enumeration values. */
export const GEDCOM7_RESN_VALUES = [
	"CONFIDENTIAL",
	"LOCKED",
	"PRIVACY",
] as const;
export type Gedcom7ResnValue = (typeof GEDCOM7_RESN_VALUES)[number];

const isAllowed = (value: string, allowed: readonly string[]) =>
	allowed.includes(value);

type RestoreFn = () => void;

const moveToPhrase = (node: Common, phrase: string): RestoreFn => {
	const previousValue = node.value;
	const previousPhrase = node.get("PHRASE");
	const previousPhraseValue = previousPhrase?.toValue();

	node.removeValue();
	if (previousPhrase) {
		previousPhrase.value = phrase;
	} else {
		const phraseNode = createCommon(node.getGedcom(), undefined, node.main);
		phraseNode.value = phrase;
		node.set("PHRASE", phraseNode);
	}

	return () => {
		if (previousValue === undefined) {
			node.removeValue();
		} else {
			node.value = previousValue;
		}
		if (previousPhrase) {
			previousPhrase.value = previousPhraseValue;
		} else {
			node.remove("PHRASE");
		}
	};
};

const normalizeEnum = (
	node: Common | undefined,
	allowed: readonly string[],
	mode: "upper" | "lower",
	restores: RestoreFn[]
) => {
	const value = node?.toValue();
	if (!node || typeof value !== "string" || !value.trim()) {
		return;
	}
	const normalized =
		mode === "upper" ? value.trim().toUpperCase() : value.trim().toLowerCase();
	if (isAllowed(normalized, allowed)) {
		if (value !== normalized) {
			const previous = node.value;
			node.value = normalized;
			restores.push(() => {
				node.value = previous;
			});
		}
		return;
	}
	restores.push(moveToPhrase(node, value.trim()));
};

/**
 * Temporarily rewrite SEX / PEDI / ROLE / RESN values that are not valid
 * GEDCOM 7 enumerations into PHRASE. Returns a restore callback.
 */
export const applyGedcom7Enumerations = (gedcom: GedComType): RestoreFn => {
	const restores: RestoreFn[] = [];

	gedcom.indis()?.forEach((indi) => {
		if (!indi) return;

		normalizeEnum(indi.get("SEX"), GEDCOM7_SEX_VALUES, "upper", restores);
		normalizeEnum(indi.get("RESN"), GEDCOM7_RESN_VALUES, "upper", restores);

		indi
			.get("FAMC")
			?.toList()
			?.forEach((famc) => {
				normalizeEnum(
					famc?.get("PEDI") ?? famc?.get("PEDT"),
					GEDCOM7_PEDI_VALUES,
					"lower",
					restores
				);
			});

		indi
			.get("ASSO")
			?.toList()
			?.forEach((asso) => {
				normalizeEnum(
					asso?.get("ROLE"),
					GEDCOM7_ROLE_VALUES,
					"upper",
					restores
				);
			});
	});

	gedcom.fams()?.forEach((fam) => {
		if (!fam) return;
		normalizeEnum(fam.get("RESN"), GEDCOM7_RESN_VALUES, "upper", restores);
		fam
			.get("ASSO")
			?.toList()
			?.forEach((asso) => {
				normalizeEnum(
					asso?.get("ROLE"),
					GEDCOM7_ROLE_VALUES,
					"upper",
					restores
				);
			});
	});

	return () => {
		for (let i = restores.length - 1; i >= 0; i -= 1) {
			restores[i]?.();
		}
	};
};
