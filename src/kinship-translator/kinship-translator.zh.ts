import { nameFormatter } from "../utils/name-formatter";

import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsZh } from "./patterns.zh";

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
			return pick(sex, "父亲", "母亲", "父母");
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
		return pick(sex, `${L}世祖`, `${L}世祖母`, `${L}世祖父母`);
	}

	if (L <= 1) {
		return pick(sex, "儿子", "女儿", "子女");
	}
	if (L === 2) {
		return pick(sex, "孙子", "孙女", "孙子女");
	}
	if (L === 3) {
		return pick(sex, "曾孙", "曾孙女", "曾孙子女");
	}
	if (L === 4) {
		return pick(sex, "玄孙", "玄孙女", "玄孙子女");
	}
	return pick(sex, `${L}世孙`, `${L}世孙女`, `${L}世孙子女`);
};

const cousinPlain = (degree: number, sex: Sex) => {
	if (degree <= 1) {
		return pick(sex, "堂表兄弟", "堂表姐妹", "堂表亲");
	}
	if (degree === 2) {
		return pick(sex, "从堂表兄弟", "从堂表姐妹", "从堂表亲");
	}
	return pick(
		sex,
		`${degree}代堂表兄弟`,
		`${degree}代堂表姐妹`,
		`${degree}代堂表亲`
	);
};

export default class KinshipTranslatorZh extends KinshipTranslatorBasic {
	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}
		return cousinPlain(degree, sexOf(this.personN));
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
		return `${cousinPlain(degree, sexOf(this.personN))}（隔${removed}代）`;
	}

	auncle() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 2) {
			return pick(sex, "叔叔", "阿姨", "叔伯/姑姨");
		}
		if (level === 3) {
			return pick(sex, "伯叔祖父", "姑祖母", "伯叔祖父母");
		}
		return pick(
			sex,
			`${level - 2}代前的叔叔`,
			`${level - 2}代前的阿姨`,
			`${level - 2}代前的叔伯/姑姨`
		);
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const sex = sexOf(this.personN);
		if (level <= 2) {
			return pick(sex, "侄子", "侄女", "侄子女");
		}
		if (level === 3) {
			return pick(sex, "侄孙", "侄孙女", "侄孙子女");
		}
		return pick(
			sex,
			`${level - 2}代下的侄子`,
			`${level - 2}代下的侄女`,
			`${level - 2}代下的侄子女`
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
		return pick(sexOf(this.personN), "兄弟", "姐妹", "兄弟姐妹");
	}

	halfBlood(relation?: string | undefined) {
		if (!relation || !this.isHalfBlood) {
			return relation ?? "";
		}
		return `异父母的${relation}`;
	}

	spouse() {
		return pick(sexOf(this.personN), "丈夫", "妻子", "配偶");
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}
		const spouseType = pick(
			sexOf(this.path?.[1].indi),
			"丈夫",
			"妻子",
			"配偶"
		);
		return `${spouseType}的${relation}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}
		const spouse = this.path?.[this.path.length - 1].indi;
		const spouseType = pick(sexOf(spouse), "丈夫", "妻子", "配偶");
		return `${relation}的${spouseType}`;
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

		return `${name}的${relation}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsZh).find((pattern) => {
			const regex = new RegExp(`^${pattern}$`);
			if (relation?.match(regex)) {
				inLawRelation = InLawsZh[pattern];
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
		return `${this.pathN.relation}${relation}`;
	}
}
