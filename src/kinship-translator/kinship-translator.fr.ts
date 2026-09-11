import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsFr, parentRelationsFr } from "./patterns.fr";

type Sex = "m" | "f" | "n";

const sexOf = (person?: {
	isMale?: () => boolean;
	isFemale?: () => boolean;
}): Sex => {
	if (person?.isMale?.()) {
		return "m";
	}
	if (person?.isFemale?.()) {
		return "f";
	}
	return "n";
};

const pick = (sex: Sex, male: string, female: string, neutral: string) => {
	if (sex === "m") {
		return male;
	}
	if (sex === "f") {
		return female;
	}
	return neutral;
};

const arriere = (count: number) => (count > 0 ? "arrière-".repeat(count) : "");

const frenchOrdinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

const isFeminineRelation = (relation: string) =>
	/mère|fille|sœur|tante|nièce|cousine|épouse/.test(relation);

const ofSpousePrep = (spouseType: string) => {
	if (spouseType === "épouse") {
		return "de l'";
	}
	return "du ";
};

export default class KinshipTranslatorFr extends KinshipTranslatorBasic {
	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		const cousin = pick(
			sexOf(this.personN),
			"cousin",
			"cousine",
			"cousin/cousine"
		);
		if (degree <= 1) {
			return cousin;
		}

		return `${cousin} au ${frenchOrdinal(degree)} degré`;
	}

	removal() {
		const level = this.pathN?.level ?? 0;
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (!degree) {
			return level < 0 ? this.nibling() : this.auncle();
		}

		return `${this.indirect()} ${Math.abs(level)}× éloigné`;
	}

	auncle() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		const base = pick(sex, "oncle", "tante", "oncle/tante");
		if (level <= 1) {
			return base;
		}

		const grands = pick(
			sex,
			"grand-oncle",
			"grand-tante",
			"grand-oncle/tante"
		);
		return `${arriere(level - 2)}${grands}`;
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "neveu", "nièce", "neveu/nièce");
		}

		const grands = pick(
			sex,
			"grand-neveu",
			"grande-nièce",
			"grand-neveu/grande-nièce"
		);
		return `${arriere(level - 2)}${grands}`;
	}

	parent() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "père", "mère", "parent");
		}

		const grands = pick(sex, "grand-père", "grand-mère", "grand-parent");
		return `${arriere(level - 2)}${grands}`;
	}

	child() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "fils", "fille", "enfant");
		}

		const petits = pick(sex, "petit-fils", "petite-fille", "petit-enfant");
		return `${arriere(level - 2)}${petits}`;
	}

	sibling() {
		return pick(sexOf(this.personN), "frère", "sœur", "frère/sœur");
	}

	halfBlood(relation?: string | undefined) {
		if (!relation || !this.isHalfBlood) {
			return relation ?? "";
		}

		return `demi-${relation}`;
	}

	spouse() {
		return pick(sexOf(this.personN), "mari", "épouse", "conjoint");
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouseType = pick(
			sexOf(this.path?.[1].indi),
			"mari",
			"épouse",
			"conjoint"
		);

		return `${relation} ${ofSpousePrep(spouseType)}${spouseType}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouseType = pick(
			sexOf(this.path?.[this.path.length - 1].indi),
			"mari",
			"épouse",
			"conjoint"
		);

		return `${spouseType} de ${relation}`;
	}

	of(relation?: string | undefined) {
		const formattedName = nameFormatter(this.path?.[0]?.indi, {
			nameOrder: "first-last",
		});

		let name = formattedName.inOrder.filter(Boolean).join(" ");

		if (this.displayName === "none") {
			name = "";
		} else if (this.displayName === "givenname") {
			name = formattedName.givenname;
		} else if (this.displayName === "surname") {
			name = `${formattedName.surname}`;
		}

		if (!name || !relation) {
			return relation ?? "";
		}

		if (relation.includes(" du ") || relation.includes(" de ")) {
			return relation.replace(/ (du|de) /, ` $1 ${name} `);
		}

		if (relation.includes(" de l'")) {
			return relation.replace(" de l'", ` de ${name} l'`);
		}

		return `${relation} de ${name}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsFr).find((pattern) => {
			const regex = new RegExp(
				`(?<space> )(?<word1>${pattern})$|^(?<word2>${pattern})$`
			);

			if (relation?.match(regex)) {
				inLawRelation = relation?.replace(regex, (m, ...rest) => {
					const groups = rest[rest.length - 1] as
						| {
								word1?: string;
								word2?: string;
								space?: string;
						  }
						| undefined;
					const word = groups?.word1 || groups?.word2;
					if (!word) {
						return m;
					}
					const toReplace =
						InLawsFr[word.trim()] || InLawsFr[pattern];
					return toReplace ? `${groups.space || ""}${toReplace}` : m;
				});
				return true;
			}

			return false;
		});

		return inLawRelation ?? "";
	}

	relationType(relation?: string | undefined) {
		if (!relation || !this.pathN?.relation) {
			return relation ?? "";
		}

		const kind = parentRelationsFr[this.pathN.relation];
		if (!kind) {
			return relation;
		}

		if (kind === "step") {
			return `${isFeminineRelation(relation) ? "belle-" : "beau-"}${relation}`;
		}

		if (kind === "adopted") {
			return `${relation} ${isFeminineRelation(relation) ? "adoptive" : "adoptif"}`;
		}

		if (kind === "foster") {
			return `${relation} d'accueil`;
		}

		return relation;
	}
}
