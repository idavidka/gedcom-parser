import { nameFormatter } from "../utils/name-formatter";
import { ordinalize } from "../utils/ordinalize";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsFr } from "./patterns.fr";

export default class KinshipTranslatorFr extends KinshipTranslatorBasic {
	private directPrefix() {
		const level = Math.abs(this.pathN?.level ?? 0);
		if (level <= 1) {
			return "";
		}

		if (level === 2) {
			return "grand-";
		}

		if (level === 3) {
			return "arrière-grand-";
		}

		return `arrière${level - 2}-grand-`;
	}

	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (degree === 1) {
			return `cousin`;
		}

		return `cousin au ${ordinalize(degree)} degré`;
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

		return `cousin au ${ordinalize(degree)} degré ${Math.abs(level)}× éloigné`;
	}

	auncle() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}oncle`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}tante`;
		}

		return `${prefix}oncle/tante`;
	}

	nibling() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}neveu`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}nièce`;
		}

		return `${prefix}neveu/nièce`;
	}

	parent() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}père`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}mère`;
		}

		return `${prefix}parent`;
	}

	child() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}fils`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}fille`;
		}

		return `${prefix}enfant`;
	}

	sibling() {
		const parents1 = this.person1?.getBiologicalParents();
		const parentsN = this.personN?.getBiologicalParents();

		const inter = parents1?.intersection(parentsN);

		let prefix = "";
		if (!inter || inter.length < 2) {
			prefix = "demi-";
		}

		if (this.personN?.isMale()) {
			return `${prefix}frère`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}sœur`;
		}

		return `${prefix}frère/sœur`;
	}

	spouse() {
		if (this.personN?.isMale()) {
			return "mari";
		}

		if (this.personN?.isFemale()) {
			return "épouse";
		}

		return "conjoint";
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[1].indi;

		let spouseType = "conjoint";
		if (spouse?.isMale()) {
			spouseType = "mari";
		}

		if (spouse?.isFemale()) {
			spouseType = "épouse";
		}

		return `${relation} du ${spouseType}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[this.path.length - 1].indi;

		let spouseType = "conjoint";
		if (spouse?.isMale()) {
			spouseType = "mari";
		}

		if (spouse?.isFemale()) {
			spouseType = "épouse";
		}

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

		return `${this.pathN.relation} ${relation}`;
	}
}
