import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsEs, parentRelationsEs } from "./patterns.es";

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

const SPANISH_ORDINALS_M = [
	"",
	"",
	"segundo",
	"tercero",
	"cuarto",
	"quinto",
	"sexto",
	"séptimo",
	"octavo",
	"noveno",
	"décimo",
];
const SPANISH_ORDINALS_F = [
	"",
	"",
	"segunda",
	"tercera",
	"cuarta",
	"quinta",
	"sexta",
	"séptima",
	"octava",
	"novena",
	"décima",
];

const spanishOrdinal = (n: number, sex: Sex) => {
	const list = sex === "f" ? SPANISH_ORDINALS_F : SPANISH_ORDINALS_M;
	return list[n] ?? `${n}.º`;
};

const ofSpousePrep = (spouseType: string) => {
	if (spouseType === "esposa") {
		return "de la ";
	}
	return "del ";
};

export default class KinshipTranslatorEs extends KinshipTranslatorBasic {
	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		const sex = sexOf(this.personN);
		const cousin = pick(sex, "primo", "prima", "primo/prima");
		if (degree <= 1) {
			return cousin;
		}

		return `${cousin} ${spanishOrdinal(degree, sex)}`;
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

		return `${this.indirect()} ${Math.abs(level)}× separado`;
	}

	auncle() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "tío", "tía", "tío/tía");
		}

		if (level === 2) {
			return pick(sex, "tío abuelo", "tía abuela", "tío/tía abuelo");
		}

		if (level === 3) {
			return pick(
				sex,
				"tío bisabuelo",
				"tía bisabuela",
				"tío/tía bisabuelo"
			);
		}

		return pick(
			sex,
			`tío abuelo (${level - 1}.º)`,
			`tía abuela (${level - 1}.ª)`,
			`tío/tía abuelo (${level - 1}.º)`
		);
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "sobrino", "sobrina", "sobrino/sobrina");
		}

		if (level === 2) {
			return pick(
				sex,
				"sobrino nieto",
				"sobrina nieta",
				"sobrino/sobrina nieto"
			);
		}

		if (level === 3) {
			return pick(
				sex,
				"sobrino bisnieto",
				"sobrina bisnieta",
				"sobrino/sobrina bisnieto"
			);
		}

		return pick(
			sex,
			`sobrino nieto (${level - 1}.º)`,
			`sobrina nieta (${level - 1}.ª)`,
			`sobrino/sobrina nieto (${level - 1}.º)`
		);
	}

	parent() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "padre", "madre", "padre/madre");
		}

		if (level === 2) {
			return pick(sex, "abuelo", "abuela", "abuelo/abuela");
		}

		if (level === 3) {
			return pick(sex, "bisabuelo", "bisabuela", "bisabuelo/bisabuela");
		}

		if (level === 4) {
			return pick(
				sex,
				"tatarabuelo",
				"tatarabuela",
				"tatarabuelo/tatarabuela"
			);
		}

		if (level === 5) {
			return pick(
				sex,
				"trastatarabuelo",
				"trastatarabuela",
				"trastatarabuelo/trastatarabuela"
			);
		}

		return pick(
			sex,
			`abuelo (${level}.º)`,
			`abuela (${level}.ª)`,
			`abuelo/abuela (${level}.º)`
		);
	}

	child() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			return pick(sex, "hijo", "hija", "hijo/hija");
		}

		if (level === 2) {
			return pick(sex, "nieto", "nieta", "nieto/nieta");
		}

		if (level === 3) {
			return pick(sex, "bisnieto", "bisnieta", "bisnieto/bisnieta");
		}

		if (level === 4) {
			return pick(
				sex,
				"tataranieto",
				"tataranieta",
				"tataranieto/tataranieta"
			);
		}

		if (level === 5) {
			return pick(
				sex,
				"trastataranieto",
				"trastataranieta",
				"trastataranieto/trastataranieta"
			);
		}

		return pick(
			sex,
			`nieto (${level}.º)`,
			`nieta (${level}.ª)`,
			`nieto/nieta (${level}.º)`
		);
	}

	sibling() {
		return pick(sexOf(this.personN), "hermano", "hermana", "hermano/hermana");
	}

	halfBlood(relation?: string | undefined) {
		if (!relation || !this.isHalfBlood) {
			return relation ?? "";
		}

		if (this.personN?.isFemale()) {
			return `media ${relation}`;
		}

		if (this.personN?.isMale()) {
			return `medio ${relation}`;
		}

		return `medio/a ${relation}`;
	}

	spouse() {
		return pick(sexOf(this.personN), "esposo", "esposa", "cónyuge");
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouseType = pick(
			sexOf(this.path?.[1].indi),
			"esposo",
			"esposa",
			"cónyuge"
		);

		return `${relation} ${ofSpousePrep(spouseType)}${spouseType}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouseType = pick(
			sexOf(this.path?.[this.path.length - 1].indi),
			"esposo",
			"esposa",
			"cónyuge"
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

		if (
			relation.includes(" del ") ||
			relation.includes(" de la ") ||
			relation.includes(" de ")
		) {
			return relation.replace(/ (del|de la|de) /, ` $1 ${name} `);
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

		const mapped = parentRelationsEs[this.pathN.relation]?.[relation];
		if (mapped) {
			return mapped;
		}

		if (this.pathN.relation === "step") {
			return `${relation} político`;
		}

		if (this.pathN.relation === "adopted") {
			return `${relation} adoptivo`;
		}

		if (this.pathN.relation === "foster") {
			return `${relation} de acogida`;
		}

		return relation;
	}
}
