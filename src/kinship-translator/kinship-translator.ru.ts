import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsRu } from "./patterns.ru";

const GENITIVE: Record<string, string> = {
	сын: "сына",
	дочь: "дочери",
	ребёнок: "ребёнка",
	брат: "брата",
	сестра: "сестры",
	сиблинг: "сиблинга",
	отец: "отца",
	мать: "матери",
	родитель: "родителя",
	муж: "мужа",
	жена: "жены",
	супруг: "супруга",
	супруга: "супруги",
};

const toGenitive = (word: string) => GENITIVE[word] ?? word;

const cousinWord = (degree: number, sex: "m" | "f" | "n") => {
	const stem =
		degree <= 1
			? "двоюродн"
			: degree === 2
				? "троюродн"
				: degree === 3
					? "четвероюродн"
					: `${degree + 1}-юродн`;
	if (sex === "m") {
		return `${stem}ый брат`;
	}
	if (sex === "f") {
		return `${stem}ая сестра`;
	}
	return `${stem}ый брат/сестра`;
};

const praRepeat = (count: number) => (count > 0 ? "пра".repeat(count) : "");

const sexOf = (person?: {
	isMale?: () => boolean;
	isFemale?: () => boolean;
}) => {
	if (person?.isMale?.()) {
		return "m" as const;
	}
	if (person?.isFemale?.()) {
		return "f" as const;
	}
	return "n" as const;
};

export default class KinshipTranslatorRu extends KinshipTranslatorBasic {
	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		return cousinWord(degree, sexOf(this.personN));
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

		const removed = Math.abs(level);
		return `${cousinWord(degree, sexOf(this.personN))} (${removed}× через поколение)`;
	}

	auncle() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const pra = praRepeat(Math.max(0, level - 2));
		const sex = sexOf(this.personN);
		if (sex === "m") {
			return `${pra}дядя`;
		}
		if (sex === "f") {
			return `${pra}тётя`;
		}
		return `${pra}дядя/тётя`;
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const pra = praRepeat(Math.max(0, level - 2));
		const sex = sexOf(this.personN);
		if (sex === "m") {
			return `${pra}племянник`;
		}
		if (sex === "f") {
			return `${pra}племянница`;
		}
		return `${pra}племянник/племянница`;
	}

	parent() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			if (sex === "m") {
				return "отец";
			}
			if (sex === "f") {
				return "мать";
			}
			return "родитель";
		}
		if (level === 2) {
			if (sex === "m") {
				return "дед";
			}
			if (sex === "f") {
				return "бабушка";
			}
			return "дед/бабушка";
		}
		const pra = praRepeat(level - 2);
		if (sex === "m") {
			return `${pra}дед`;
		}
		if (sex === "f") {
			return `${pra}бабушка`;
		}
		return `${pra}дед/бабушка`;
	}

	child() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 1) {
			if (sex === "m") {
				return "сын";
			}
			if (sex === "f") {
				return "дочь";
			}
			return "ребёнок";
		}
		if (level === 2) {
			if (sex === "m") {
				return "внук";
			}
			if (sex === "f") {
				return "внучка";
			}
			return "внук/внучка";
		}
		const pra = praRepeat(level - 2);
		if (sex === "m") {
			return `${pra}внук`;
		}
		if (sex === "f") {
			return `${pra}внучка`;
		}
		return `${pra}внук/внучка`;
	}

	sibling() {
		const sex = sexOf(this.personN);
		if (sex === "m") {
			return "брат";
		}
		if (sex === "f") {
			return "сестра";
		}
		return "сиблинг";
	}

	halfBlood(relation?: string | undefined) {
		if (!relation || !this.isHalfBlood) {
			return relation ?? "";
		}

		if (
			/сестра|дочь|мать|тётя|бабушка|жена|племянница|внучка/.test(
				relation
			)
		) {
			return `сводная ${relation}`;
		}

		return `сводный ${relation}`;
	}

	spouse() {
		const sex = sexOf(this.personN);
		if (sex === "m") {
			return "муж";
		}
		if (sex === "f") {
			return "жена";
		}
		return "супруг";
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[1].indi;
		const sex = sexOf(spouse);
		const spouseType =
			sex === "m" ? "муж" : sex === "f" ? "жена" : "супруг";

		return `${relation} ${toGenitive(spouseType)}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[this.path.length - 1].indi;
		const sex = sexOf(spouse);
		const spouseType =
			sex === "m" ? "муж" : sex === "f" ? "жена" : "супруг";

		return `${spouseType} ${toGenitive(relation)}`;
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

		return `${name}: ${relation}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsRu).find((pattern) => {
			const regex = new RegExp(`^${pattern}$`);

			if (relation?.match(regex)) {
				inLawRelation = InLawsRu[pattern];
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
