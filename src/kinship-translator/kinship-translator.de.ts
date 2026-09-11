import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsDe, parentRelationsDe } from "./patterns.de";

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

const ur = (count: number) => (count > 0 ? "Ur".repeat(count) : "");

const genitiveArticle = (spouseType: string) => {
	if (spouseType === "Ehefrau") {
		return `der ${spouseType}`;
	}
	return `des ${spouseType}s`;
};

export default class KinshipTranslatorDe extends KinshipTranslatorBasic {
	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		const sex = sexOf(this.personN);
		const cousin = pick(sex, "Cousin", "Cousine", "Cousin/Cousine");
		if (degree <= 1) {
			return cousin;
		}

		return `${cousin} ${degree}. Grades`;
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

		return `${this.indirect()} ${Math.abs(level)}× entfernt`;
	}

	auncle() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "Onkel", "Tante", "Onkel/Tante");
		}

		const prefix = `${ur(level - 2)}Groß`;
		return pick(
			sex,
			`${prefix}onkel`,
			`${prefix}tante`,
			`${prefix}onkel/tante`
		);
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "Neffe", "Nichte", "Neffe/Nichte");
		}

		const prefix = `${ur(level - 2)}Groß`;
		return pick(
			sex,
			`${prefix}neffe`,
			`${prefix}nichte`,
			`${prefix}neffe/nichte`
		);
	}

	parent() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "Vater", "Mutter", "Elternteil");
		}

		const prefix = `${ur(level - 2)}Groß`;
		return pick(
			sex,
			`${prefix}vater`,
			`${prefix}mutter`,
			`${prefix}elternteil`
		);
	}

	child() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "Sohn", "Tochter", "Kind");
		}

		const prefix = ur(level - 2);
		return pick(
			sex,
			`${prefix}Enkel`,
			`${prefix}Enkelin`,
			`${prefix}Enkelkind`
		);
	}

	sibling() {
		return pick(sexOf(this.personN), "Bruder", "Schwester", "Geschwister");
	}

	halfBlood(relation?: string | undefined) {
		if (!relation || !this.isHalfBlood) {
			return relation ?? "";
		}

		if (/[\s-]/.test(relation) || /^(Groß|Ur)/.test(relation)) {
			return `Halb-${relation}`;
		}

		return `Halb${relation.charAt(0).toLowerCase()}${relation.slice(1)}`;
	}

	spouse() {
		return pick(sexOf(this.personN), "Ehemann", "Ehefrau", "Ehepartner");
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouseType = pick(
			sexOf(this.path?.[1].indi),
			"Ehemann",
			"Ehefrau",
			"Ehepartner"
		);

		return `${relation} ${genitiveArticle(spouseType)}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouseType = pick(
			sexOf(this.path?.[this.path.length - 1].indi),
			"Ehemann",
			"Ehefrau",
			"Ehepartner"
		);

		return `${spouseType} von ${relation}`;
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

		if (
			relation.includes(" des ") ||
			relation.includes(" der ") ||
			relation.includes(" von ")
		) {
			return relation.replace(/ (des|der|von) /, ` $1 ${name}s `);
		}

		return `${name}s ${relation}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsDe).find((pattern) => {
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
						InLawsDe[word.trim()] || InLawsDe[pattern];
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

		const prefix = parentRelationsDe[this.pathN.relation];
		if (!prefix) {
			return relation;
		}

		if (prefix.endsWith("-") || prefix.endsWith(" ")) {
			return `${prefix}${relation}`;
		}

		return `${prefix}${relation.charAt(0).toLowerCase()}${relation.slice(1)}`;
	}
}
