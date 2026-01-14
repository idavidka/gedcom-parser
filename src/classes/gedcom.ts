import type { ConvertOptions } from "../interfaces/common";
import type IGedcom from "../interfaces/gedcom";
import type IEventDetailStructure from "../structures/event-detail-structure";
import type IGedComStructure from "../structures/gedcom";
import type {
	ListTag,
	IdType,
	IndiKey,
	FamKey,
	ObjeKey,
	SourKey,
	RepoKey,
	SubmKey,
	MultiTag,
} from "../types/types";
import { getVersion } from "../utils/get-product-details";

import { Common, createCommon } from "./common";
import type { FamType } from "./fam";
import type { Families } from "./fams";
import { CustomTags } from "./indi";
import type { IndiType } from "./indi";
import type { Individuals } from "./indis";
import { List } from "./list";
import type { ObjeType } from "./obje";
import type { Objects } from "./objes";
import type { RepoType } from "./repo";
import type { Repositories } from "./repos";
import type { SourType } from "./sour";
import type { Sources } from "./sours";
import type { SubmType } from "./subm";
import type { Submitters } from "./subms";

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
			return (list as List).item(index as IdType) as T | undefined;
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

		const keys = (list as List).keys() as IdType[];
		return (list as List).item(keys[index]) as T | undefined;
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

	/**
	 * Generate statistics about the GEDCOM file
	 * @param individuals Optional list of individuals to calculate statistics for. If not provided, all individuals from the GEDCOM will be used.
	 * @returns Object containing various statistics about the GEDCOM data
	 */
	stats(individuals?: Individuals) {
		const indis = individuals ?? this.indis();

		// Build families list based on whether individuals filter is provided
		let families: Families | undefined;

		if (individuals) {
			// If individuals filter is provided, filter families by references
			const familyIds = new Set<FamKey>();
			indis?.forEach((indi) => {
				// Add spouse families
				indi.FAMS?.toList()?.forEach((famRef) => {
					const famId = famRef.value as FamKey | undefined;
					if (famId) familyIds.add(famId);
				});
				// Add parent families
				indi.FAMC?.toList()?.forEach((famRef) => {
					const famId = famRef.value as FamKey | undefined;
					if (famId) familyIds.add(famId);
				});
			});

			families = this.fams()?.filter((fam) =>
				fam.id ? familyIds.has(fam.id) : false
			);
		} else {
			// No filter provided, use all families directly
			families = this.fams();
		} // Calculate statistics
		const totalIndividuals = indis?.length || 0;
		const totalFamilies = families?.length || 0;

		// Count by sex
		let males = 0;
		let females = 0;
		let unknownSex = 0;

		indis?.forEach((indi) => {
			const sex = indi.SEX?.value;
			if (sex === "M") males++;
			else if (sex === "F") females++;
			else unknownSex++;
		});

		// Most common surnames
		const surnames = new Map<string, number>();
		indis?.forEach((indi) => {
			const name = indi.NAME?.toValue();
			if (name) {
				const match = name.match(/\/(.+?)\//);
				if (match) {
					const surname = match[1];
					surnames.set(surname, (surnames.get(surname) || 0) + 1);
				}
			}
		});

		const topSurnames = Array.from(surnames.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([surname, count]) => ({ surname, count }));

		// Most common birth places
		const birthPlaces = new Map<string, number>();
		indis?.forEach((indi) => {
			const place = indi.BIRT?.PLAC?.value;
			if (place) {
				birthPlaces.set(place, (birthPlaces.get(place) || 0) + 1);
			}
		});

		const topBirthPlaces = Array.from(birthPlaces.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([place, count]) => ({ place, count }));

		// Date range
		const years: number[] = [];
		indis?.forEach((indi) => {
			const birthDate = indi.BIRT?.DATE?.toValue();
			if (birthDate) {
				const match = birthDate.match(/\d{4}/);
				if (match) {
					years.push(parseInt(match[0], 10));
				}
			}
			const deathDate = indi.DEAT?.DATE?.toValue();
			if (deathDate) {
				const match = deathDate.match(/\d{4}/);
				if (match) {
					years.push(parseInt(match[0], 10));
				}
			}
		});

		const minYear = years.length > 0 ? Math.min(...years) : null;
		const maxYear = years.length > 0 ? Math.max(...years) : null;

		// Average lifespan
		const lifespans: number[] = [];
		indis?.forEach((indi) => {
			const birthDate = indi.BIRT?.DATE?.toValue();
			const deathDate = indi.DEAT?.DATE?.toValue();
			if (birthDate && deathDate) {
				const birthMatch = birthDate.match(/\d{4}/);
				const deathMatch = deathDate.match(/\d{4}/);
				if (birthMatch && deathMatch) {
					const birthYear = parseInt(birthMatch[0], 10);
					const deathYear = parseInt(deathMatch[0], 10);
					if (deathYear > birthYear) {
						lifespans.push(deathYear - birthYear);
					}
				}
			}
		});

		const avgLifespan =
			lifespans.length > 0
				? lifespans.reduce((sum, age) => sum + age, 0) /
					lifespans.length
				: null;

		// First and last person events with type information
		const firstPerson = indis?.getFirstEvent();
		const firstBirth = firstPerson?.BIRT?.toList().index(0) as
			| IEventDetailStructure
			| undefined;
		const firstDeath = firstPerson?.DEAT?.toList().index(0) as
			| IEventDetailStructure
			| undefined;

		let firstPersonEvent = null;
		const firstBirthDate = (firstBirth as IEventDetailStructure)?.DATE
			?.rawValue;
		const firstDeathDate = (firstDeath as IEventDetailStructure)?.DATE
			?.rawValue;

		if (firstBirthDate || firstDeathDate) {
			const isBirth =
				!firstBirthDate ||
				(firstDeathDate && firstDeathDate < firstBirthDate)
					? false
					: true;

			firstPersonEvent = {
				type: isBirth ? "BIRT" : "DEAT",
				event: isBirth ? firstBirth : firstDeath,
				person: firstPerson,
			};
		}

		const lastPerson = indis?.getLastEvent();
		const lastBirth = lastPerson?.BIRT?.toList().index(0) as
			| (Common & IEventDetailStructure)
			| undefined;
		const lastDeath = lastPerson?.DEAT?.toList().index(0) as
			| (Common & IEventDetailStructure)
			| undefined;

		let lastPersonEvent = null;
		const lastBirthDate = (lastBirth as Common & IEventDetailStructure)
			?.DATE?.rawValue;
		const lastDeathDate = (lastDeath as Common & IEventDetailStructure)
			?.DATE?.rawValue;

		if (lastBirthDate || lastDeathDate) {
			const isBirth =
				!lastDeathDate ||
				(lastBirthDate && lastDeathDate < lastBirthDate)
					? true
					: false;

			lastPersonEvent = {
				type: isBirth ? "BIRT" : "DEAT",
				event: isBirth ? lastBirth : lastDeath,
				person: lastPerson,
			};
		}

		return {
			totalIndividuals,
			totalFamilies,
			byGender: {
				males,
				females,
				unknown: unknownSex,
			},
			dateRange: {
				earliest: minYear,
				latest: maxYear,
			},
			averageLifespan: avgLifespan
				? Math.round(avgLifespan * 10) / 10
				: null,
			topSurnames,
			topBirthPlaces,
			firstPersonEvent,
			lastPersonEvent,
		};
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

// Constants for merge operation
const MERGE_ID_INCREMENT_MULTIPLIER = 1000;

/**
 * Helper function to convert a Common or List value to a string for comparison
 */
const valueToString = (value: Common | List | undefined): string => {
	if (!value) return "";
	return (
		value.toString?.() ||
		String((value as Common | undefined)?.toValue?.() || "")
	);
};

/**
 * Merge two GEDCOM objects into a single result using a configurable matching strategy
 * @param targetGedcom - The base GEDCOM (kept as the primary source)
 * @param sourceGedcom - The GEDCOM to be merged into the target
 * @param strategy - Matching strategy: "id" (default) to match by individual ID, or any MultiTag (e.g., "NAME", "BIRT.DATE") to match by that field's value
 * @returns The merged GedComType with all individuals and families combined
 *
 * @example
 * // Merge by ID (individuals with same ID are considered the same person)
 * const merged = await mergeGedcoms(target, source, "id");
 *
 * @example
 * // Merge by NAME (individuals with same name are considered the same person)
 * const merged = await mergeGedcoms(target, source, "NAME");
 *
 * @remarks
 * - Source individuals are always assigned new unique IDs to avoid conflicts
 * - When individuals match by strategy, they are merged (data and relationships combined)
 * - All family relationships (FAMS/FAMC) are preserved with updated ID references
 */
export const mergeGedcoms = (
	targetGedcom: GedComType,
	sourceGedcom: GedComType,
	strategy: MultiTag | "id" = "id"
): GedComType => {
	// Work directly with the target GEDCOM (no serialization needed)
	const mergedGedcom = targetGedcom;

	// Track ID mapping: source ID -> new ID in merged GEDCOM
	const idMap = new Map<IdType, IdType>();

	// Track matching: sourceIndiId -> targetIndiId (for individuals that match by strategy)
	const matchMap = new Map<IndiKey, IndiKey>();

	// Get source individuals and families
	const sourceIndis = sourceGedcom.indis();
	const sourceFams = sourceGedcom.fams();
	const targetIndis = mergedGedcom.indis();
	const targetFams = mergedGedcom.fams();

	// Step 1: Identify matches and create ID mappings for individuals
	sourceIndis?.forEach((sourceIndi) => {
		if (!sourceIndi.id) return;

		let matchedTargetIndi: IndiType | undefined;

		if (strategy === "id") {
			// Match by ID directly - check if target has this exact ID
			matchedTargetIndi = targetIndis?.item(sourceIndi.id);
		} else {
			// Match by specified MultiTag value
			const sourceValueRaw = sourceIndi.get(strategy);
			const sourceValue = valueToString(sourceValueRaw);

			if (sourceValue) {
				// Find target individual with same value
				matchedTargetIndi = targetIndis?.find((targetIndi) => {
					const targetValueRaw = targetIndi.get(strategy);
					const targetValue = valueToString(targetValueRaw);
					return Boolean(targetValue && targetValue === sourceValue);
				});
			}
		}

		if (matchedTargetIndi && matchedTargetIndi.id) {
			// Found a match - map source ID to existing target ID
			// Note: This means source individual will merge into target individual
			matchMap.set(sourceIndi.id, matchedTargetIndi.id);
			idMap.set(sourceIndi.id, matchedTargetIndi.id);
		} else {
			// No match - need to create a new unique ID
			const baseId = sourceIndi.id;
			let newId: IndiKey = baseId;
			let counter = 1;

			// Generate unique ID that doesn't conflict with target
			while (targetIndis?.item(newId) || idMap.has(newId as IdType)) {
				// Extract number from ID like @I123@ and increment
				const numMatch = baseId.match(/\d+/);
				const prefix = baseId.match(/^@[A-Z]+/)?.[0] || "@I";
				const baseNum = numMatch ? parseInt(numMatch[0]) : 1;
				newId =
					`${prefix}${baseNum + counter * MERGE_ID_INCREMENT_MULTIPLIER}@` as IndiKey;
				counter++;
			}

			idMap.set(sourceIndi.id, newId as IdType);
		}
	});

	// Step 2: Map family IDs and match families with same members
	const famMatchMap = new Map<FamKey, FamKey>(); // source family ID -> target family ID

	sourceFams?.forEach((sourceFam) => {
		if (!sourceFam.id) return;

		// Get the member IDs for this source family
		const sourceHusbId = sourceFam.HUSB?.value as IndiKey | undefined;
		const sourceWifeId = sourceFam.WIFE?.value as IndiKey | undefined;
		const sourceChildIds =
			sourceFam.CHIL?.toList()
				?.map((c) => c.value as IndiKey)
				.filter(Boolean) || [];

		// Map to their final IDs (after individual matching by strategy)
		const finalHusbId = sourceHusbId
			? (idMap.get(sourceHusbId) as IndiKey | undefined)
			: undefined;
		const finalWifeId = sourceWifeId
			? (idMap.get(sourceWifeId) as IndiKey | undefined)
			: undefined;
		const finalChildIds = sourceChildIds
			.map((id) => idMap.get(id) as IndiKey | undefined)
			.filter(Boolean);

		// Try to find a matching family in target that has the same members (after remapping)
		let matchedTargetFam: FamType | undefined;

		targetFams?.forEach((targetFam) => {
			if (matchedTargetFam) return; // Already found a match

			const targetHusbId = targetFam.HUSB?.value as IndiKey | undefined;
			const targetWifeId = targetFam.WIFE?.value as IndiKey | undefined;
			const targetChildIds =
				targetFam.CHIL?.toList()
					?.map((c) => c.value as IndiKey)
					.filter(Boolean) || [];

			// Check if husband matches (either both undefined or same final ID)
			const husbMatch =
				(!finalHusbId && !targetHusbId) || finalHusbId === targetHusbId;
			// Check if wife matches (either both undefined or same final ID)
			const wifeMatch =
				(!finalWifeId && !targetWifeId) || finalWifeId === targetWifeId;

			// For a family to match, both husband and wife must match
			// (if one is undefined in both, that's also a match)
			if (husbMatch && wifeMatch) {
				// Also check children overlap
				const childOverlap = finalChildIds.filter(
					(id) => id && targetChildIds.includes(id)
				).length;
				const totalUniqueChildren = new Set([
					...finalChildIds,
					...targetChildIds,
				]).size;

				// Match if:
				// 1. At least one spouse is present (to avoid matching empty families), OR
				// 2. At least 50% of children overlap
				const hasSpouses =
					finalHusbId ||
					finalWifeId ||
					targetHusbId ||
					targetWifeId;
				const hasMatchingChildren =
					totalUniqueChildren > 0 &&
					childOverlap / totalUniqueChildren >= 0.5;

				if (hasSpouses || hasMatchingChildren) {
					matchedTargetFam = targetFam;
				}
			}
		});

		if (matchedTargetFam && matchedTargetFam.id) {
			// Found a matching family - use the target family ID
			famMatchMap.set(sourceFam.id, matchedTargetFam.id);
			idMap.set(sourceFam.id, matchedTargetFam.id);
		} else {
			// No match - generate a new unique family ID
			const baseId = sourceFam.id;
			let newId: FamKey = baseId;
			let counter = 1;

			// Generate unique family ID
			while (targetFams?.item(newId) || idMap.has(newId as IdType)) {
				const numMatch = baseId.match(/\d+/);
				const prefix = baseId.match(/^@[A-Z]+/)?.[0] || "@F";
				const baseNum = numMatch ? parseInt(numMatch[0]) : 1;
				newId =
					`${prefix}${baseNum + counter * MERGE_ID_INCREMENT_MULTIPLIER}@` as FamKey;
				counter++;
			}

			idMap.set(sourceFam.id, newId as IdType);
		}
	});

	// Step 3: Clone and remap individuals from source
	const clonedIndis = new Map<IndiKey, IndiType>();
	sourceIndis?.forEach((sourceIndi) => {
		if (!sourceIndi.id) return;

		const newId = idMap.get(sourceIndi.id) as IndiKey | undefined;
		if (!newId) return;

		// Clone the individual
		const cloned = sourceIndi.clone(false) as IndiType;
		cloned.id = newId;
		cloned.setGedcom(mergedGedcom);

		clonedIndis.set(sourceIndi.id, cloned);
	});

	// Step 4: Clone and remap families from source
	const clonedFams = new Map<FamKey, FamType>();
	sourceFams?.forEach((sourceFam) => {
		if (!sourceFam.id) return;

		const newFamId = idMap.get(sourceFam.id) as FamKey | undefined;
		if (!newFamId) return;

		// Clone the family
		const clonedFam = sourceFam.clone(false) as FamType;
		clonedFam.id = newFamId;
		clonedFam.setGedcom(mergedGedcom);

		clonedFams.set(sourceFam.id, clonedFam);
	});

	// Step 5: Update FAMS and FAMC references in cloned individuals
	clonedIndis.forEach((clonedIndi, originalId) => {
		const sourceIndi = sourceIndis?.item(originalId);
		if (!sourceIndi) return;

		// Clear and rebuild FAMS references with remapped IDs
		clonedIndi.remove("FAMS");
		const sourceFAMS = sourceIndi.FAMS?.toList();
		sourceFAMS?.forEach((famRef) => {
			const oldFamId = famRef.value as FamKey | undefined;
			if (oldFamId) {
				const newFamId = idMap.get(oldFamId) as FamKey | undefined;
				if (newFamId) {
					const newFamRef = createCommon(
						mergedGedcom,
						undefined,
						clonedIndi
					);
					newFamRef.value = newFamId;
					clonedIndi.assign("FAMS", newFamRef, true);
				}
			}
		});

		// Clear and rebuild FAMC references with remapped IDs
		clonedIndi.remove("FAMC");
		const sourceFAMC = sourceIndi.FAMC?.toList();
		sourceFAMC?.forEach((famRef) => {
			const oldFamId = famRef.value as FamKey | undefined;
			if (oldFamId) {
				const newFamId = idMap.get(oldFamId) as FamKey | undefined;
				if (newFamId) {
					const newFamRef = createCommon(
						mergedGedcom,
						undefined,
						clonedIndi
					);
					newFamRef.value = newFamId;
					clonedIndi.assign("FAMC", newFamRef, true);
				}
			}
		});
	});

	// Step 6: Update HUSB, WIFE, and CHIL references in cloned families
	clonedFams.forEach((clonedFam, originalFamId) => {
		const sourceFam = sourceFams?.item(originalFamId);
		if (!sourceFam) return;

		// Update HUSB reference
		const sourceHusb = sourceFam.HUSB?.value as IndiKey | undefined;
		if (sourceHusb) {
			const newHusbId = idMap.get(sourceHusb) as IndiKey | undefined;
			if (newHusbId) {
				const newHusbRef = createCommon(
					mergedGedcom,
					undefined,
					clonedFam
				);
				newHusbRef.value = newHusbId;
				clonedFam.set("HUSB", newHusbRef);
			}
		}

		// Update WIFE reference
		const sourceWife = sourceFam.WIFE?.value as IndiKey | undefined;
		if (sourceWife) {
			const newWifeId = idMap.get(sourceWife) as IndiKey | undefined;
			if (newWifeId) {
				const newWifeRef = createCommon(
					mergedGedcom,
					undefined,
					clonedFam
				);
				newWifeRef.value = newWifeId;
				clonedFam.set("WIFE", newWifeRef);
			}
		}

		// Update CHIL references
		clonedFam.remove("CHIL");
		const sourceChildren = sourceFam.CHIL?.toList();
		sourceChildren?.forEach((childRef) => {
			const oldChildId = childRef.value as IndiKey | undefined;
			if (oldChildId) {
				const newChildId = idMap.get(oldChildId) as IndiKey | undefined;
				if (newChildId) {
					const newChildRef = createCommon(
						mergedGedcom,
						undefined,
						clonedFam
					);
					newChildRef.value = newChildId;
					clonedFam.assign("CHIL", newChildRef, true);
				}
			}
		});
	});

	// Step 7: Add or merge individuals into target GEDCOM
	clonedIndis.forEach((clonedIndi, originalId) => {
		const matchedTargetId = matchMap.get(originalId);

		if (matchedTargetId) {
			// This individual matches an existing one - merge data and relationships
			const targetIndi = mergedGedcom.indis()?.item(matchedTargetId);
			if (targetIndi) {
				// Merge without overriding existing data
				// If using a strategy field (not "id"), avoid merging that field since it's already the same
				const avoidKeys: MultiTag[] = strategy !== "id" ? [strategy] : [];
				targetIndi.merge(clonedIndi, false, avoidKeys);
			}
		} else {
			// This is a new individual - add it to merged GEDCOM
			if (clonedIndi.id) {
				mergedGedcom.indis()?.item(clonedIndi.id, clonedIndi);
			}
		}
	});

	// Step 8: Add or merge families into target GEDCOM
	clonedFams.forEach((clonedFam, originalFamId) => {
		if (!clonedFam.id) return;

		const matchedTargetFamId = famMatchMap.get(originalFamId);

		if (matchedTargetFamId) {
			// This family matches an existing one - merge children and data
			const targetFam = mergedGedcom.fams()?.item(matchedTargetFamId);
			if (targetFam) {
				// Merge family data without overriding
				targetFam.merge(clonedFam, false);

				// Note: Children from clonedFam are already added via merge above
				// The CHIL references in clonedFam point to the correct remapped IDs
			}
		} else {
			// This is a new family - add it to merged GEDCOM
			mergedGedcom.fams()?.item(clonedFam.id, clonedFam);
		}
	});

	return mergedGedcom;
};
