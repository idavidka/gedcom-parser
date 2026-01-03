import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsDe } from "./patterns.de";

export default class KinshipTranslatorDe extends KinshipTranslatorBasic {
	private directPrefix() {
		const level = Math.abs(this.pathN?.level ?? 0);
		if (level <= 1) {
			return "";
		}

		if (level === 2) {
			return "Groß";
		}

		if (level === 3) {
			return "Urgroß";
		}

		return `Ur${level - 2}-groß`;
	}

	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (degree === 1) {
			return `Cousin`;
		}

		return `Cousin ${degree}. Grades`;
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

		return `Cousin ${degree}. Grades ${Math.abs(level)}× entfernt`;
	}

	auncle() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}onkel`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}tante`;
		}

		return `${prefix}onkel/tante`;
	}

	nibling() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}neffe`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}nichte`;
		}

		return `${prefix}neffe/nichte`;
	}

	parent() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}vater`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}mutter`;
		}

		return `${prefix}elternteil`;
	}

	child() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}sohn`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}tochter`;
		}

		return `${prefix}kind`;
	}

	sibling() {
		const parents1 = this.person1?.getBiologicalParents();
		const parentsN = this.personN?.getBiologicalParents();

		const inter = parents1?.intersection(parentsN);

		let prefix = "";
		if (!inter || inter.length < 2) {
			prefix = "Halb";
		}

		if (this.personN?.isMale()) {
			return `${prefix}bruder`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}schwester`;
		}

		return `${prefix}geschwister`;
	}

	spouse() {
		if (this.personN?.isMale()) {
			return "Ehemann";
		}

		if (this.personN?.isFemale()) {
			return "Ehefrau";
		}

		return "Ehepartner";
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[1].indi;

		let spouseType = "Ehepartner";
		if (spouse?.isMale()) {
			spouseType = "Ehemann";
		}

		if (spouse?.isFemale()) {
			spouseType = "Ehefrau";
		}

		return `${relation} des ${spouseType}s`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[this.path.length - 1].indi;

		let spouseType = "Ehepartner";
		if (spouse?.isMale()) {
			spouseType = "Ehemann";
		}

		if (spouse?.isFemale()) {
			spouseType = "Ehefrau";
		}

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

		if (relation.includes(" des ") || relation.includes(" von ")) {
			return relation.replace(/ (des|von) /, ` $1 ${name}s `);
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

		return `${this.pathN.relation} ${relation}`;
	}
}
