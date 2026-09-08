import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsJa } from "./patterns.ja";

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

/** Ancestor / descendant labels by generation distance (level abs value). */
const lineal = (level: number, sex: Sex, kind: "asc" | "desc") => {
	const L = Math.max(1, level);
	if (kind === "asc") {
		if (L <= 1) {
			return pick(sex, "父", "母", "親");
		}
		if (L === 2) {
			return pick(sex, "祖父", "祖母", "祖父母");
		}
		if (L === 3) {
			return pick(sex, "曾祖父", "曾祖母", "曾祖父母");
		}
		if (L === 4) {
			return pick(sex, "高祖父", "高祖母", "高祖父母");
		}
		return pick(
			sex,
			`${L - 1}世の祖父`,
			`${L - 1}世の祖母`,
			`${L - 1}世の祖父母`
		);
	}

	if (L <= 1) {
		return pick(sex, "息子", "娘", "子");
	}
	if (L === 2) {
		return "孫";
	}
	if (L === 3) {
		return "曾孫";
	}
	if (L === 4) {
		return "玄孫";
	}
	return `${L - 1}世の孫`;
};

const cousinPlain = (degree: number) => {
	if (degree <= 1) {
		return "いとこ";
	}
	if (degree === 2) {
		return "またいとこ";
	}
	if (degree === 3) {
		return "はとこ";
	}
	return `${degree}親等のいとこ`;
};

export default class KinshipTranslatorJa extends KinshipTranslatorBasic {
	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}
		return cousinPlain(degree);
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
		return `${cousinPlain(degree)}（${removed}世代違い）`;
	}

	auncle() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 2) {
			return pick(sex, "おじ", "おば", "おじ/おば");
		}
		if (level === 3) {
			return pick(sex, "大おじ", "大おば", "大おじ/大おば");
		}
		return pick(
			sex,
			`${level - 2}代前のおじ`,
			`${level - 2}代前のおば`,
			`${level - 2}代前のおじ/おば`
		);
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 2) {
			return pick(sex, "甥", "姪", "甥/姪");
		}
		if (level === 3) {
			return pick(sex, "大甥", "大姪", "大甥/大姪");
		}
		return pick(
			sex,
			`${level - 2}代下の甥`,
			`${level - 2}代下の姪`,
			`${level - 2}代下の甥/姪`
		);
	}

	parent() {
		return lineal(
			Math.abs(this.pathN?.level ?? 0),
			sexOf(this.personN),
			"asc"
		);
	}

	child() {
		return lineal(
			Math.abs(this.pathN?.level ?? 0),
			sexOf(this.personN),
			"desc"
		);
	}

	sibling() {
		return pick(sexOf(this.personN), "兄弟", "姉妹", "兄弟姉妹");
	}

	halfBlood(relation?: string | undefined) {
		if (!relation || !this.isHalfBlood) {
			return relation ?? "";
		}
		return `異父母の${relation}`;
	}

	spouse() {
		return pick(sexOf(this.personN), "夫", "妻", "配偶者");
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}
		const spouseType = pick(
			sexOf(this.path?.[1].indi),
			"夫",
			"妻",
			"配偶者"
		);
		return `${spouseType}の${relation}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}
		const spouse = this.path?.[this.path.length - 1].indi;
		const spouseType = pick(sexOf(spouse), "夫", "妻", "配偶者");
		return `${relation}の${spouseType}`;
	}

	of(relation?: string | undefined) {
		const formattedName = nameFormatter(this.path?.[0]?.indi, {
			nameOrder: "last-first",
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

		return `${name}の${relation}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsJa).find((pattern) => {
			const regex = new RegExp(`^${pattern}$`);
			if (relation?.match(regex)) {
				inLawRelation = InLawsJa[pattern];
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
		return `${this.pathN.relation}の${relation}`;
	}
}
