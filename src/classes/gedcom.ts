import type IGedComStructure from "../../../types/structures/gedcom";
import {
	type IdType,
	type IndiKey,
	type FamKey,
	type ObjeKey,
	type SourKey,
	type RepoKey,
	type SubmKey,
	type MultiTag,
} from "../types";
import type { ListTag } from "../types";
import { getVersion } from "../../../utils/get-product-details";
import { type ConvertOptions } from "../interfaces/common";
import type IGedcom from "../interfaces/gedcom";

import { Common, createCommon } from "../classes/common";
import { type FamType } from "../classes/fam";
import { type Families } from "../classes/fams";
import { CustomTags, type IndiType } from "../classes/indi";
import { type Individuals } from "../classes/indis";
import { List } from "../classes/list";
import { type ObjeType } from "../classes/obje";
import { type Objects } from "../classes/objes";
import { type RepoType } from "../classes/repo";
import { type Repositories } from "../classes/repos";
import { type SourType } from "../classes/sour";
import { type Sources } from "../classes/sours";
import { type SubmType } from "../classes/subm";
import { type Submitters } from "../classes/subms";

export class GedCom extends Common implements IGedcom {
	tagMembers: Record<string, { tag: Common; indis: Individuals }> = {};
	reflist: Record<string, Common> = {};
	refcount = 0;
	constructor() {
		super();

		delete this._gedcom;
		delete this.id;

		this.removeValue();
	}

	private getMain<L extends List = List, T extends Common = Common>(
		type: MultiTag | L | undefined,
		index: number | string
	): T | undefined {
		const list =
			!type || type instanceof List ? type : this.getList<L>(type);

		if (!list) {
			return undefined;
		}

		if (typeof index === "string") {
			return list.item(index as IdType) as T | undefined;
		}

		// const keyProbe: IdType[] = [
		// 	`@I${index}@`,
		// 	`@P${index}@`,
		// 	`@XI${index}@`,
		// 	`@XXI${index}@`,
		// ];

		// let itemProbe: T | undefined;
		// keyProbe.find((key) => {
		// 	const i = list.item(key);
		// 	if (i) {
		// 		itemProbe = i as T;
		// 		return true;
		// 	}
		// 	return false;
		// });

		// if (itemProbe) {
		// 	return itemProbe as T;
		// }

		const keys = list.keys() as IdType[];
		return list.item(keys[index]) as T | undefined;
	}

	getList<T extends List = List>(type: MultiTag): T | undefined {
		return this.get(type);
	}

	indis() {
		return this.getList<Individuals>("@@INDI");
	}

	cloneIndis(
		target?: IndiKey | IndiType,
		source?: IndiKey | IndiType,
		avoidKeys: MultiTag[] = [],
		removeFromOriginalList = true
	) {
		const hasFAMS = avoidKeys.includes("FAMS");
		const targetIndi =
			typeof target === "string" ? this.indi(target) : target;
		const sourceIndi =
			typeof source === "string" ? this.indi(source) : source;

		if (!targetIndi || !sourceIndi) {
			return this;
		}

		const spousesFamily = hasFAMS ? sourceIndi.FAMS?.toList() : undefined;
		const childrenFamily = sourceIndi.FAMC?.toList();
		const cloned = targetIndi.clone(false, avoidKeys);
		const newCloned = sourceIndi.merge(cloned);

		newCloned.cloneOf = targetIndi.id;
		targetIndi.clonedBy = newCloned.id;

		if (newCloned.id) {
			this.getList("@@INDI")?.item(newCloned.id, newCloned);

			if (childrenFamily?.length) {
				childrenFamily.forEach((fam) => {
					if (!fam.ref) {
						return;
					}
					const newChild = createCommon(this, undefined, fam.ref);
					newChild.value = newCloned.id;
					fam.ref.assign("CHIL", newChild, true);
				});
			}

			if (spousesFamily?.length) {
				spousesFamily.forEach((fam) => {
					if (!fam.ref) {
						return;
					}
					const newSpouse = createCommon(this, undefined, fam.ref);
					newSpouse.value = newCloned.id;

					if (newCloned.isMale()) {
						fam.ref.assign("HUSB", newSpouse, true);
					} else if (newCloned.isFemale()) {
						fam.ref.assign("WIFE", newSpouse, true);
					}
				});
			}

			if (
				removeFromOriginalList &&
				newCloned.type &&
				newCloned.type !== targetIndi.type
			) {
				this.getList(`@@${newCloned.type}` as ListTag)?.removeItem(
					newCloned.id as IndiKey
				);
			}
			newCloned.type = "INDI";
		}
	}

	mergeIndis(
		target?: IndiKey | IndiType,
		source?: IndiKey | IndiType,
		removeFromOriginalList = true
	) {
		const targetIndi =
			typeof target === "string" ? this.indi(target) : target;
		const sourceIndi =
			typeof source === "string" ? this.indi(source) : source;

		if (!targetIndi || !sourceIndi) {
			return this;
		}

		const sourceIndiId = sourceIndi.id;
		const spousesFamily = sourceIndi.FAMS?.toList();
		const childrenFamily = sourceIndi.FAMC?.toList();
		const newLinked = targetIndi.merge(sourceIndi);
		const mergedId = newLinked.id;

		if (sourceIndiId && (spousesFamily?.length || childrenFamily?.length)) {
			if (childrenFamily?.length && mergedId) {
				childrenFamily.forEach((fam) => {
					if (!fam.ref) {
						return;
					}
					const newChild = createCommon(this, undefined, fam.ref);
					newChild.value = mergedId;
					fam.ref.assign("CHIL", newChild, true);
				});
			}

			if (spousesFamily?.length && mergedId) {
				spousesFamily.forEach((fam) => {
					if (!fam.ref) {
						return;
					}
					const newSpouse = createCommon(this, undefined, fam.ref);
					newSpouse.value = mergedId;

					if (newLinked?.isMale()) {
						fam.ref.assign("HUSB", newSpouse, true);
					} else if (newLinked?.isFemale()) {
						fam.ref.assign("WIFE", newSpouse, true);
					}
				});
			}
		}

		if (removeFromOriginalList && sourceIndi?.type && sourceIndi.id) {
			this.getList(`@@${sourceIndi.type}` as ListTag)?.removeItem(
				sourceIndi.id as IndiKey
			);
		}
	}

	fams() {
		return this.getList<Families>("@@FAM");
	}

	objes() {
		return this.getList<Objects>("@@OBJE");
	}

	sours() {
		return this.getList<Sources>("@@SOUR");
	}

	repos() {
		return this.getList<Repositories>("@@REPO");
	}

	subms() {
		return this.getList<Submitters>("@@SUBM");
	}

	tags() {
		return this.getList("@@_MTTAG");
	}

	customTags() {
		return this.getList("@@_MTTAG")?.filter((tag) => {
			return tag?.get("_MTCAT.NAME")?.toValue() === "Custom";
		});
	}

	indi(index: number | IndiKey) {
		return this.getMain<Individuals, IndiType>(this.indis(), index);
	}

	fam(index: number | FamKey) {
		return this.getMain<Families, FamType>(this.fams(), index);
	}

	obje(index: number | ObjeKey) {
		return this.getMain<List, ObjeType>(this.objes(), index);
	}

	sour(index: number | SourKey) {
		return this.getMain<List, SourType>(this.sours(), index);
	}

	repo(index: number | RepoKey) {
		return this.getMain<List, RepoType>(this.repos(), index);
	}

	subm(index: number | SubmKey) {
		return this.getMain<List, SubmType>(this.subms(), index);
	}

	tag(index: number | SubmKey) {
		return this.getMain(this.tags(), index);
	}

	fromList(id?: string) {
		return id ? this.reflist?.[id] : undefined;
	}

	tagByName(name?: string) {
		return this.tags()?.find((tag) => {
			const tagName = tag?.get("NAME")?.toValue() as string | undefined;

			return tagName === name;
		});
	}

	customTag(index: number | SubmKey) {
		return this.getMain(this.customTags(), index);
	}

	private getIndiRelatedLists(
		indis: IndiKey[]
	): Partial<Record<ListTag, List>> {
		const refs: Record<IdType, Common> = {};
		const individuals = this.indis()?.filter((indi, indiKey) => {
			if (indis.includes(indiKey as IndiKey)) {
				indi.getRefs()
					?.values()
					?.forEach((ref) => {
						const refKey = ref?.value as IdType | undefined;
						if (ref && refKey && !refs[refKey]) {
							refs[refKey] = ref;
						}
					});
				return true;
			}

			return false;
		});
		const usedLists = Object.entries(this).filter(([prop, list]) => {
			return (
				prop !== "@@INDI" &&
				prop.startsWith("@@") &&
				list instanceof List
			);
		}) as [ListTag, List][];

		const lists: Partial<Record<ListTag, List>> = {};

		if (individuals) {
			lists["@@INDI"] = individuals;
		}

		usedLists.forEach(([key, list]) => {
			const validKey = key as ListTag;

			if (list) {
				lists[validKey] = list.filter((item) => {
					return Boolean(item.id && refs[item.id]);
				});
			}
		});

		return lists;
	}

	private getDownloadHeader() {
		const newHead = createCommon() as Required<IGedComStructure>["HEAD"];

		Object.assign(newHead!, this.get("HEAD") ?? {});

		const newSour = createCommon() as Required<
			Required<IGedComStructure>["HEAD"]
		>["SOUR"];
		newSour.set("CORP", createCommon());
		newSour.set("CORP.WWW", createCommon());
		newSour.set("NAME", createCommon());
		newSour.set("VERS", createCommon());

		newSour.CORP!.value = "TreeViz - The Family Tree Visualiser";
		newSour.CORP!.WWW!.value = "treeviz.com";
		newSour.NAME!.value = "TreeViz - The Family Tree Visualiser";
		newSour.VERS!.value = getVersion();

		newHead!.set("SOUR", newSour);

		return newHead;
	}

	toFiltered(indis: IndiKey[]) {
		if (!indis.length) {
			return this;
		}

		const newGedcom = createGedCom();

		const newContent = this.getIndiRelatedLists(indis);

		Object.assign(newGedcom, this, newContent, {
			HEAD: this.getDownloadHeader(),
		});

		return newGedcom;
	}

	toJson(
		tag?: MultiTag | undefined,
		options?:
			| (ConvertOptions & {
					indis?: IndiKey[];
			  })
			| undefined
	): string {
		if (!options?.indis?.length) {
			return super.toJson(tag, options);
		}

		const newGedcom = createGedCom();

		const newContent = this.getIndiRelatedLists(options.indis);

		Object.assign(newGedcom, this, newContent, {
			HEAD: this.getDownloadHeader(),
		});

		delete options.indis;
		return newGedcom.toJson(tag, options);
	}

	toGedcom(
		tag?: MultiTag | undefined,
		level?: number,
		options?:
			| (ConvertOptions & {
					indis?: IndiKey[];
			  })
			| undefined
	): string {
		if (options?.super) {
			return super.toGedcom(tag, level, options);
		}

		const newGedcom = createGedCom();

		if (!options?.original) {
			Object.assign(newGedcom, {
				HEAD: this.getDownloadHeader(),
			});
		}

		Object.assign(newGedcom, this);

		if (options?.indis?.length) {
			const newContent = this.getIndiRelatedLists(options.indis);

			Object.assign(newGedcom, newContent);
		}

		return newGedcom.toGedcom(tag, level, { ...options, super: true });
	}

	hasTag(tag?: string | Common) {
		const tagName =
			typeof tag === "string"
				? tag
				: (tag?.get("NAME")?.toValue() as string | undefined);
		if (!tagName) {
			return false;
		}

		return !!this.tagMembers?.[tagName]?.indis?.length;
	}

	hasUnknownAncestor() {
		return !!this.tagMembers?.[CustomTags.UnknownAncestor]?.indis?.length;
	}

	hasIgnoredMember() {
		return !!this.tagMembers?.[CustomTags.IgnoredMember]?.indis?.length;
	}

	hasUnattachedMember() {
		return !!this.tagMembers?.[CustomTags.UnattachedMember]?.indis?.length;
	}

	hasUnknownGivenname() {
		return !!this.tagMembers?.[CustomTags.UnknownGivenname]?.indis?.length;
	}

	hasUnknownSurname() {
		return !!this.tagMembers?.[CustomTags.UnknownSurname]?.indis?.length;
	}

	hasNonRelevant() {
		return this.hasUnknownAncestor() || this.hasUnattachedMember();
	}

	/**
	 * Get all places from the GEDCOM with occurrence counts
	 * @returns Record mapping place names to their occurrence count
	 */
	getAllPlaces() {
		const indis = this.indis();
		const allPlaces: Record<string, number> = {};

		indis?.forEach((indi) => {
			if (!indi.id) return;
			const places = indi.getPlaces();
			places.forEach((placeObj) => {
				const placeName = placeObj?.place as string | undefined;
				if (placeName && typeof placeName === "string") {
					allPlaces[placeName] = (allPlaces[placeName] || 0) + 1;
				}
			});
		});

		return allPlaces;
	}

	/**
	 * Get all places from the GEDCOM with associated individual IDs
	 * @param usedIndis Optional array of individual IDs to filter by
	 * @returns Record mapping place names to arrays of individual IDs
	 */
	getAllPlacesWithIndis(usedIndis: IndiKey[] = []) {
		const indis = this.indis();
		const allPlaces: Record<string, IndiKey[]> = {};

		indis?.forEach((indi) => {
			if (
				!indi.id ||
				(usedIndis.length && !usedIndis.includes(indi.id))
			) {
				return;
			}
			const places = indi.getPlaces();
			places.forEach((placeObj) => {
				const placeName = placeObj?.place as string | undefined;
				if (placeName && typeof placeName === "string" && indi.id) {
					if (!allPlaces[placeName]) {
						allPlaces[placeName] = [];
					}
					allPlaces[placeName].push(indi.id);
				}
			});
		});

		return allPlaces;
	}
}

export type GedComType = GedCom & IGedComStructure;
export const createGedCom = (): GedComType => {
	return new GedCom();
};

export const isGedcomString = (gedcomString?: string) => {
	return (
		typeof gedcomString === "string" &&
		gedcomString[0] === "0" &&
		gedcomString
			.split("\n")
			.slice(0, 1000)
			.every((l) => !l || /^\d+\s+/.test(l))
	);
};

/**
 * Validates if a string is a valid GEDCOM file content
 * @param content - The file content to validate
 * @returns An object with `valid` boolean and optional `error` message
 */
export const validateGedcomContent = (
	content?: string
): { valid: boolean; error?: string } => {
	if (!content) {
		return { valid: false, error: "File is empty" };
	}

	const trimmedContent = content.trim();
	if (!trimmedContent) {
		return { valid: false, error: "File is empty" };
	}

	// Check for common binary file signatures
	const firstBytes = trimmedContent.substring(0, 10);
	const isBinary =
		firstBytes.startsWith("\x89PNG") || // PNG
		firstBytes.startsWith("\xFF\xD8\xFF") || // JPEG
		firstBytes.startsWith("GIF8") || // GIF
		firstBytes.startsWith("BM") || // BMP
		firstBytes.startsWith("PK") || // ZIP
		firstBytes.startsWith("%PDF") || // PDF
		// eslint-disable-next-line no-control-regex
		/[\x00-\x08\x0E-\x1F]/.test(firstBytes); // Other binary content

	if (isBinary) {
		return {
			valid: false,
			error: "File appears to be a binary file (image, PDF, etc.), not a GEDCOM text file",
		};
	}

	// Check if content starts with GEDCOM header
	// GEDCOM files must start with "0 HEAD" or "0 head" (case-insensitive)
	const startsWithHeader = /^0\s+(HEAD|head)/i.test(trimmedContent);

	if (!startsWithHeader) {
		return {
			valid: false,
			error: "Invalid GEDCOM file format. File must start with '0 HEAD' record",
		};
	}

	/**
	 * Turning this off, because it's invalidating multiline gedcom property
	 * (I know these kind of GEDCOMs are not standard, but need to allow any user files)
	 **/
	// Additional check using the existing isGedcomString logic
	// if (!isGedcomString(trimmedContent)) {
	// 	return {
	// 		valid: false,
	// 		error: "Invalid GEDCOM file format. File contains invalid line formats",
	// 	};
	// }

	return { valid: true };
};
