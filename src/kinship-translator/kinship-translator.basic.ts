import type {Path} from "../classes/indi";
import { RelationType } from "../types/types";

import type IKinshipTranslator from "./kinship-translator.interface";

export default class KinshipTranslatorBasic implements IKinshipTranslator {
	isOfSpouse = false;
	isSpouseOf = false;
	displayName: "none" | "givenname" | "surname" | "all";

	private readonly _path?: Path;
	constructor(
		path: Path,
		displayName: "none" | "givenname" | "surname" | "all" = "givenname"
	) {
		this._path = path;
		this.displayName = displayName;
	}

	protected get path() {
		return this._path;
	}

	get path0() {
		return this.path?.[0];
	}

	get path1() {
		return this.path?.[1];
	}

	get pathM() {
		return this.path?.[this.path.length - 2];
	}

	get pathN() {
		return this.path?.[this.path.length - 1];
	}

	get person1() {
		if (this.isOfSpouse) {
			return this.path1?.indi;
		}

		return this.path0?.indi;
	}

	get person2() {
		return this.path1?.indi;
	}

	get personM() {
		return this.pathM?.indi;
	}

	get personN() {
		if (this.isSpouseOf) {
			return this.pathM?.indi;
		}

		return this.pathN?.indi;
	}

	/**
	 * True when the path goes through a common ancestor whose two children
	 * (the person we came from and the person we go to) share fewer than two
	 * biological parents — i.e. they are half-siblings, so every collateral
	 * relative on this path is a half-aunt/half-cousin/... too.
	 *
	 * Direct ancestors/descendants and paths that already use a
	 * step/adopted/foster edge are never half-blood.
	 */
	protected get isHalfBlood(): boolean {
		const path = this.path;
		if (!path || path.length < 3) {
			return false;
		}

		if (
			path.some(
				(item) =>
					item.relation && item.relation !== RelationType.BIOLOGICAL
			)
		) {
			return false;
		}

		let peakIndex = -1;
		for (let i = 1; i < path.length; i++) {
			if (path[i].kinship === "parent") {
				peakIndex = i;
			}
		}

		if (peakIndex <= 0 || peakIndex >= path.length - 1) {
			return false;
		}

		if (path[peakIndex + 1].kinship !== "child") {
			return false;
		}

		const siblingA = path[peakIndex - 1].indi;
		const siblingB = path[peakIndex + 1].indi;
		const parentsA = siblingA.getBiologicalParents();
		const parentsB = siblingB.getBiologicalParents();
		const inter = parentsA.intersection(parentsB);

		// Only call it half-blood when we can see an unshared parent. If both
		// children only have the common ancestor recorded, the other parent
		// might still be shared and just missing from the tree.
		return (
			inter.length === 1 && (parentsA.length > 1 || parentsB.length > 1)
		);
	}

	indirect() {
		return "";
	}

	removal() {
		return "";
	}

	parent() {
		return "";
	}

	child() {
		return "";
	}

	sibling() {
		return "";
	}

	spouse() {
		return "";
	}

	ofSpouse(relation?: string | undefined) {
		return relation ?? "";
	}

	spouseOf(relation?: string | undefined) {
		return relation ?? "";
	}

	relationType(relation?: string | undefined) {
		return relation ?? "";
	}

	halfBlood(relation?: string | undefined) {
		return relation ?? "";
	}

	of(relation?: string | undefined) {
		return relation ?? "";
	}

	inLaw(relation?: string | undefined) {
		return relation ?? "";
	}
}
