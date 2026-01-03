import { nameFormatter } from "../utils/name-formatter";
import { ordinalize } from "../utils/ordinalize";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsEs } from "./patterns.es";

export default class KinshipTranslatorEs extends KinshipTranslatorBasic {
	private directPrefix() {
		const level = Math.abs(this.pathN?.level ?? 0);
		if (level <= 1) {
			return "";
		}

		if (level === 2) {
			return "bisabuel";
		}

		if (level === 3) {
			return "tatarabuel";
		}

		return `tátara${level - 2}-abuel`;
	}

	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (degree === 1) {
			return `primo`;
		}

		return `primo ${ordinalize(degree)}`;
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

		return `primo ${ordinalize(degree)} ${Math.abs(level)}× separado`;
	}

	auncle() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}tío`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}tía`;
		}

		return `${prefix}tío/tía`;
	}

	nibling() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}sobrino`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}sobrina`;
		}

		return `${prefix}sobrino/sobrina`;
	}

	parent() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}padre`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}madre`;
		}

		return `${prefix}padre/madre`;
	}

	child() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}hijo`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}hija`;
		}

		return `${prefix}hijo/hija`;
	}

	sibling() {
		const parents1 = this.person1?.getBiologicalParents();
		const parentsN = this.personN?.getBiologicalParents();

		const inter = parents1?.intersection(parentsN);

		let prefix = "";
		if (!inter || inter.length < 2) {
			prefix = "medio ";
		}

		if (this.personN?.isMale()) {
			return `${prefix}hermano`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}hermana`;
		}

		return `${prefix}hermano/hermana`;
	}

	spouse() {
		if (this.personN?.isMale()) {
			return "esposo";
		}

		if (this.personN?.isFemale()) {
			return "esposa";
		}

		return "cónyuge";
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[1].indi;

		let spouseType = "cónyuge";
		if (spouse?.isMale()) {
			spouseType = "esposo";
		}

		if (spouse?.isFemale()) {
			spouseType = "esposa";
		}

		return `${relation} del ${spouseType}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[this.path.length - 1].indi;

		let spouseType = "cónyuge";
		if (spouse?.isMale()) {
			spouseType = "esposo";
		}

		if (spouse?.isFemale()) {
			spouseType = "esposa";
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

		if (relation.includes(" del ") || relation.includes(" de ")) {
			return relation.replace(/ (del|de) /, ` $1 ${name} `);
		}

		return `${relation} de ${name}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsEs).find((pattern) => {
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
						InLawsEs[word.trim()] || InLawsEs[pattern];
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
