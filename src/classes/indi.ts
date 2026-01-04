import * as Filters from "../constants/filters";

import {
	BIRTH_ASC,
	DATE_ASC,
	getMarriageAscAndChildBirth,
} from "../constants/orders";
import { getKinshipTranslatorClass } from "../factories/kinship-factory";
import type {
	MediaList,
	GeneratedIndiMethods,
	GeneratorKey,
	GeneratorType,
} from "../interfaces/indi";
import type IIndi from "../interfaces/indi";
import type { Kinship } from "../kinship-translator/kinship-translator.interface";
import type { Language } from "../kinship-translator/types";
import type IIndividualStructure from "../structures/individual";
import type { AncestryMedia } from "../types/ancestry-media";
import { RelationType, PartnerType } from "../types/types";
import type {
	IndiKey,
	FamKey,
	Filter,
	RequiredFilter,
	ObjeKey,
	MultiTag,
	IdType,
} from "../types/types";
import { pathCache, relativesCache } from "../utils/cache";
import { dateFormatter } from "../utils/date-formatter";
import { PlaceType, getPlaces } from "../utils/get-places";
import type { Place } from "../utils/get-places";
import { implemented } from "../utils/logger";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import type { FamType } from "./fam";
import { Families } from "./fams";
import type { GedComType } from "./gedcom";
import { Individuals } from "./indis";
import { List } from "./list";
import { CommonName, createCommonName } from "./name";
import type { ObjeType } from "./obje";

export enum Existed {
	SPOUSE = "spouse",
	YES = "yes",
}

export enum CustomTags {
	UnknownGivenname = "Unknown givenname",
	UnknownSurname = "Unknown surname",
	UnattachedMember = "Unattached member",
	IgnoredMember = "Ignored member",
	UnknownAncestor = "Unknown Ancestor",
}

const ALLOWED_FACTS: MultiTag[] = [
	"EVEN",
	"OCCU",
	"OCCUPATIONS",
	"RESI",
	"BAPT",
	"CHRI",
	"CHR",
	"BURI",
	"EDUC",
	"GRAD",
	"DIV",
	"IMMI",
	"RELI",
	"_MILT",
	"_MILTID",
	"FACT",
	"_ORIG",
];

const DISALLOWED_CUSTOM_FACTS: string[] = ["DNA Test", "Newspaper"];

const CustomFactRenderers: Partial<
	Record<MultiTag, (label: Common, fact: Common, indi?: IndiType) => void>
> = {
	AKA: (label: Common, fact: Common, indi?: IndiType) => {
		const originalNameObj = indi?.NAME;
		const note = fact.get("NOTE");
		const factName = note?.toValue() as string | undefined;

		const name = createCommonName(fact.getGedcom(), undefined, indi);
		const suffix = originalNameObj?.NSFX?.toValue() as string | undefined;
		const surname = originalNameObj?.SURN?.toValue() as string | undefined;
		const givenname = originalNameObj?.GIVN?.toValue() as
			| string
			| undefined;

		const nameParts: Array<{
			name: string;
			givenname?: boolean;
			surname?: boolean;
			suffix?: boolean;
		}> = [
			...(givenname
				?.split(" ")
				.map((s) => ({ name: s, givenname: true })) ?? []),
			...(surname?.split(" ").map((s) => ({ name: s, surname: true })) ??
				[]),
			...(suffix?.split(" ").map((s) => ({ name: s, suffix: true })) ??
				[]),
		].filter(Boolean);

		const factParts = factName?.split(" ");
		if (
			nameParts.length === factParts?.length &&
			!(note instanceof CommonName)
		) {
			const guessedSuffix: string[] = [];
			const guessedSurname: string[] = [];
			const guessedGivenname: string[] = [];
			factParts.forEach((f, i) => {
				const namePart = nameParts[i];
				if (!f) {
					return;
				}
				if (namePart.suffix) {
					guessedSuffix.push(f);
				} else if (namePart.givenname) {
					guessedGivenname.push(f);
				} else if (namePart.surname) {
					guessedSurname.push(f);
				}
			});
			const allNamePart: string[] = [];
			if (guessedGivenname.length) {
				allNamePart.push(guessedGivenname.join(" "));
			}
			if (guessedSurname.length) {
				allNamePart.push(`/${guessedSurname.join(" ")}/`);
			}
			if (guessedSuffix.length) {
				allNamePart.push(guessedSuffix.join(" "));
			}
			name.value = allNamePart.join(" ");
		} else {
			name.value = factName;
		}

		fact.set("NOTE", name);

		label.value = "AKA";
		fact.set("_LABEL", label);
	},
};

const relativesOnLevelCache = relativesCache("relativesOnLevelCache");
const relativesOnDegreeCache = relativesCache("relativesOnDegreeCache");

export class Indi extends Common<string, IndiKey> implements IIndi {
	private _isUnknownAncestor?: boolean;
	private _isUnattachedMember?: boolean;
	private _isOrphanFamilyMember?: boolean;
	private _isUnknownGivenname?: boolean;
	private _isUnknownSurname?: boolean;
	private _isIgnoredPerson?: boolean;
	private _isEmpty?: boolean;
	private readonly _places?: Record<string, Place[]>;

	toName() {
		return this.get<Common>("NAME")?.toValue();
	}

	toNaturalName() {
		return this.get<Common>("NAME")?.toValue()?.replaceAll("/", "");
	}

	toList() {
		return new Individuals().concat(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.id ? { [this.id]: this } : ({ ...[this] } as any)
		);
	}

	private generateTree(props: {
		generations: IndiTree | IndiGenealogy;
		level: number;
		famIndex: number;
		index: number;
		showDescendants?: boolean;
		offspringSpouses?: boolean;
		ancestorSpouses?: boolean;
		onlyDescendants?: boolean;
		maxLevel?: number;
		minLevel?: number;
		drawNonBiologicalAncestors?: boolean;
		ancestorSiblings?: boolean;
	}) {
		const {
			generations,
			level,
			index,
			showDescendants,
			offspringSpouses,
			ancestorSpouses,
			onlyDescendants,
			maxLevel,
			minLevel,
			drawNonBiologicalAncestors,
			ancestorSiblings,
		} = props;
		if (!this.id) {
			throw new Error("Indi must have an id");
		}
		const isMainDescendantLevel = showDescendants && level <= 1;
		const isDescendantLevel = showDescendants && level < 1;
		if (level < 1 && !isDescendantLevel) {
			throw new Error("Arguments 2 must be greater than 0.");
		}

		if (
			(maxLevel !== undefined && maxLevel < level) ||
			(minLevel !== undefined && minLevel > level)
		) {
			return this;
		}

		// Only for debug
		// if (level > 3) {
		// 	return this;
		// }

		const gens: IndiTree = generations ?? {
			existed: {},
			tree: {},
			halves: {},
			lastItems: {},
		};

		const families = this.getFamiliesBiologicalFirst("FAMC");
		const familiesAllMember = families.getParents();

		families.forEach((fam, famKey, famIndex) => {
			if (!this.id) {
				return;
			}

			const id = fam.id;
			let father = isDescendantLevel
				? undefined
				: fam.getHusband().index(0);
			let mother = isDescendantLevel ? undefined : fam.getWife().index(0);

			const children =
				isMainDescendantLevel && famIndex > 0
					? this.getChildren()
					: undefined;

			if (
				father?.id &&
				(gens.existed[father.id] === Existed.YES ||
					(!drawNonBiologicalAncestors &&
						this.getParentType(father.id) !==
							RelationType.BIOLOGICAL))
			) {
				// console.info(
				// 	"Father already in tree",
				// 	father.toName(),
				// 	father,
				// 	gens.existed[father.id]
				// );
				father = undefined;
			}

			if (
				mother?.id &&
				(gens.existed[mother.id] === Existed.YES ||
					(!drawNonBiologicalAncestors &&
						this.getParentType(mother.id) !==
							RelationType.BIOLOGICAL))
			) {
				// console.info(
				// 	"Mother already in tree",
				// 	mother.toName(),
				// 	mother,
				// 	gens.existed[mother.id]
				// );
				mother = undefined;
			}

			if (
				!id &&
				!father &&
				!mother &&
				(!children?.length || famIndex > 0)
			) {
				return this;
			}

			let fatherSpouses: Individuals | undefined;

			if (father && ancestorSpouses) {
				fatherSpouses = father
					.getCoParents()
					.orderBy(getMarriageAscAndChildBirth(father.id));

				if (drawNonBiologicalAncestors) {
					fatherSpouses = fatherSpouses
						.copy()
						.exclude(familiesAllMember);
				}

				if (mother) {
					fatherSpouses = fatherSpouses.except(mother);
				}
			}

			let motherSpouses: Individuals | undefined;
			if (mother && ancestorSpouses) {
				motherSpouses = mother
					.getCoParents()
					.orderBy(getMarriageAscAndChildBirth(mother.id));

				if (drawNonBiologicalAncestors) {
					motherSpouses = motherSpouses
						.copy()
						.exclude(familiesAllMember);
				}

				if (father) {
					motherSpouses = motherSpouses.except(father);
				}
			}

			let childIndex = 0;
			const amount = Math.pow(2, level - 1);
			const half = Math.floor(amount / 2);
			const closers: TreeMember & {
				children?: IndiType[];
			} = {
				id: id || this.id,
				index,
				father: isDescendantLevel
					? this.isMale()
						? this
						: undefined
					: onlyDescendants
						? undefined
						: father?.generateTree({
								generations: gens,
								level: level + 1,
								famIndex: famIndex * 2,
								index: index * 2,
								ancestorSpouses,
								ancestorSiblings,
								maxLevel,
								minLevel,
								drawNonBiologicalAncestors,
							}),
				fatherSpouses:
					fatherSpouses &&
					((fatherSpouses.values() ?? []) as IndiType[]),
				mother: isDescendantLevel
					? this.isFemale()
						? this
						: undefined
					: onlyDescendants
						? undefined
						: mother?.generateTree({
								generations: gens,
								level: level + 1,
								famIndex: famIndex * 2,
								index: index * 2 + (famIndex > 0 ? 0 : 1),
								ancestorSpouses,
								ancestorSiblings,
								maxLevel,
								minLevel,
								drawNonBiologicalAncestors,
							}),
				motherSpouses:
					motherSpouses &&
					((motherSpouses.values() ?? []) as IndiType[]),
				children: children
					?.map((descendant) => {
						const descendantTree = descendant.generateTree({
							generations: gens,
							level: level === 1 ? -1 : level - 1,
							famIndex: 0,
							index: childIndex++,
							showDescendants: true,
							offspringSpouses,
							maxLevel,
							minLevel,
						});
						if (offspringSpouses) {
							const spousesTrees = descendant
								.getCoParents()
								.orderBy(
									getMarriageAscAndChildBirth(descendant.id)
								)
								.map((spouse) => {
									return spouse.generateTree({
										generations: gens,
										level: level === 1 ? -1 : level - 1,
										famIndex: 0,
										index: childIndex++,
										showDescendants: true,
										offspringSpouses,
										maxLevel,
										minLevel,
									});
								});
							return [descendantTree, ...spousesTrees];
						}

						return [descendantTree];
					})
					.flat(),
			};

			if (!gens.tree[level]) {
				gens.tree[level] = [];
			}
			if (level < 0) {
				gens.tree[level].push(closers);
			} else {
				if (index >= half && gens.halves[level] === undefined) {
					gens.halves[level] = gens.tree[level].length;
				}

				gens.tree[level].push(closers);
				gens.lastItems[level] = closers;
			}
			if (father?.id) {
				gens.existed[father.id] = Existed.YES;
			}

			if (mother?.id) {
				gens.existed[mother.id] = Existed.YES;
			}

			closers.children?.forEach(({ id }) => {
				if (id) {
					gens.existed[id] = Existed.YES;
				}
			});
			[
				...(closers.fatherSpouses ?? []),
				...(closers.motherSpouses ?? []),
			]?.forEach(({ id }) => {
				if (id) {
					gens.existed[id] = Existed.SPOUSE;
				}
			});
		});

		return this;
	}

	getPlaces(type: PlaceType | PlaceType[] = [PlaceType.All], maxLevel = 1) {
		if (!this._gedcom || !this.id) {
			return [];
		}

		const cacheKey = JSON.stringify(type);
		if (this._places?.[cacheKey]) {
			return this._places[cacheKey];
		}

		let marriages: Common | List | undefined;
		if (
			type?.includes(PlaceType.Marriage) ||
			type?.includes(PlaceType.All)
		) {
			const families = this.getFamilies("FAMS");

			// if (families.length === 1) {
			// 	marriages = families.index(0);
			// } else
			if (families.length >= 1) {
				marriages = new List();
				families.forEach((fam) => {
					if (fam.MARR) {
						const newMarr = createCommon(
							this._gedcom,
							undefined,
							this
						);
						Object.assign(newMarr, fam.MARR);
						newMarr.id = fam.id;
						(marriages as List).append(newMarr);
					}
				});
			}
		}

		let usedIndi: IndiType | undefined;
		// let usedMaxLevel = maxLevel;
		if (marriages) {
			usedIndi = createIndi(this._gedcom, this.id);
			Object.assign(usedIndi, this, {
				MARR: marriages,
			});
			// usedMaxLevel = usedMaxLevel === 1 ? 2 : usedMaxLevel;
		}

		const places = getPlaces(usedIndi || this, type, maxLevel);

		return places;
	}

	getTree(props?: {
		descendants?: boolean;
		offspringSpouses?: boolean;
		ancestorSpouses?: boolean;
		onlyDescendants?: boolean;
		maxGen?: number;
		minGen?: number;
		drawNonBiologicalAncestors?: boolean;
		ancestorSiblings?: boolean;
	}) {
		const {
			descendants,
			offspringSpouses,
			ancestorSpouses,
			onlyDescendants,
			maxGen,
			minGen,
			drawNonBiologicalAncestors,
			ancestorSiblings,
		} = props ?? {};
		const newGenerations: IndiTree = {
			existed: {},
			tree: {},
			halves: {},
			lastItems: {},
		};
		this.generateTree({
			generations: newGenerations,
			level: 1,
			famIndex: 0,
			index: 0,
			showDescendants: descendants,
			offspringSpouses,
			ancestorSpouses,
			onlyDescendants,
			maxLevel: maxGen,
			minLevel: minGen,
			drawNonBiologicalAncestors,
			ancestorSiblings,
		});
		return Object.keys(newGenerations.tree)
			.toSorted((a, b) => Number(a) - Number(b))
			.map((key) => {
				const gen = Number(key);
				return {
					gen,
					indis: newGenerations.tree[gen],
					half: newGenerations.halves[gen],
				};
			});
	}

	getGenealogy(onlyStraight = false, showDescendants = false) {
		const id = this.get("FAMC")?.toList().index(0)?.toValue() as
			| FamKey
			| undefined;
		if (!id) {
			return;
		}

		const own = this.isMale()
			? {
					father: this,
					mother: !onlyStraight
						? this.getCoParents().index(0)
						: undefined,
				}
			: {
					mother: this,
					father: !onlyStraight
						? this.getCoParents().index(0)
						: undefined,
				};

		const newGenerations: IndiGenealogy = {
			existed: {
				[this.id!]: Existed.YES,
			},
			tree: {
				0: [
					{
						id,
						index: 0,
						...own,
					},
				],
			},
			halves: { 0: 0 },
			lastItems: {},
		};

		this.generateTree({
			generations: newGenerations,
			level: 1,
			famIndex: 0,
			index: 0,
			showDescendants,
		});

		const gens = Object.keys(newGenerations.tree).toSorted(
			(a, b) => Number(b) - Number(a)
		);

		const genealogyGenerations: IndiGenealogyGenerations = {};
		const genealogyResult: IndiGenealogyResult = {};

		gens.forEach((genIndex) => {
			const gen = Number(genIndex);
			const generation = newGenerations.tree[gen].flat();

			if (!genealogyGenerations[gen]) {
				genealogyGenerations[gen] = {
					left: [],
					main: { left: [], right: [] },
					right: [],
				};
			} else {
				if (!genealogyGenerations[gen].left) {
					genealogyGenerations[gen].left = [];
				}
				if (!genealogyGenerations[gen].main) {
					genealogyGenerations[gen].main = { left: [], right: [] };
				}
				if (!genealogyGenerations[gen].right) {
					genealogyGenerations[gen].right = [];
				}
			}

			generation.forEach((pack, index) => {
				const members: {
					left: Array<IndiType | undefined>;
					right: Array<IndiType | undefined>;
				} = { left: [], right: [] };

				["father", "mother"].forEach((type, mIndex) => {
					const key = type as keyof Pick<
						TreeMember,
						"father" | "mother"
					>;
					const typedPack = pack?.[key];
					const validIndex = index * 2 + mIndex;
					const side =
						validIndex >= generation.length ? "right" : "left";

					if (typedPack) {
						members[side].push(typedPack);
					}
				});

				if (!onlyStraight) {
					["father", "mother"].forEach((type, mIndex) => {
						const key = type as keyof Pick<
							TreeMember,
							"father" | "mother"
						>;
						const typedPack = pack?.[key];
						const validIndex = index * 2 + mIndex;
						const side =
							validIndex >= generation.length ? "right" : "left";

						const spouse =
							key === "father" ? pack?.mother : pack?.father;

						const spouses = (
							typedPack?.getCoParents().values() ?? []
						).filter((item) => {
							if (item?.id === spouse?.id) {
								return false;
							}

							if (item!.id && !newGenerations.existed[item!.id]) {
								newGenerations.existed[item!.id] = Existed.YES;
								return true;
							}

							return false;
						}) as IndiType[];

						const rawSiblings =
							typedPack
								?.getSiblings()
								.orderBy(BIRTH_ASC)
								.values() ?? [];

						const siblings = rawSiblings.reduce<
							Array<IndiType | undefined>
						>((acc, item, index) => {
							if (item!.id && !newGenerations.existed[item!.id]) {
								newGenerations.existed[item!.id] = Existed.YES;

								const siblingSpouses = (
									item?.getCoParents().values() ?? []
								).filter((siblingSpouse) => {
									if (
										siblingSpouse!.id &&
										!newGenerations.existed[
											siblingSpouse!.id
										]
									) {
										newGenerations.existed[
											siblingSpouse!.id
										] = Existed.YES;
										return true;
									}

									return false;
								}) as IndiType[];

								if (siblingSpouses.length) {
									const newValue = item?.isMale()
										? [item, ...siblingSpouses]
										: [...siblingSpouses, item];

									return [
										...acc,
										...(index > 0 &&
										newValue.length > 1 &&
										acc[acc.length - 1] !== undefined
											? [undefined]
											: []),
										...newValue,
										...(index < rawSiblings.length - 1 &&
										newValue.length > 1
											? [undefined]
											: []),
									];
								}

								return [...acc, item];
							}

							return acc;
						}, []) as Array<IndiType | undefined>;

						const spouseMethod =
							key === "father" ? "unshift" : "push";
						const siblingMethod =
							side === "left" ? "unshift" : "push";
						members[side][spouseMethod](...spouses);

						if (siblings.length) {
							if (
								(key === "father" && pack?.mother) ||
								(key === "mother" && pack?.father)
							) {
								members[side][siblingMethod](undefined);
							}

							members[side][siblingMethod](...siblings);
						}
					});
				}

				genealogyGenerations[gen].main.left.push(
					members.left.length ? members.left : undefined
				);
				genealogyGenerations[gen].main.right.push(
					members.right.length ? members.right : undefined
				);
			});
		});

		gens.forEach((genIndex) => {
			const gen = Number(genIndex);
			const prevGen = gen - 1;

			if (!genealogyGenerations[prevGen]) {
				genealogyGenerations[prevGen] = {
					left: [],
					main: { left: [], right: [] },
					right: [],
				};
			}

			["left", "right"].forEach((s) => {
				const side = s as keyof MemberSide;

				if (!onlyStraight) {
					genealogyGenerations[gen].main[side].forEach((pack) => {
						if (!pack) {
							return;
						}

						const toRight = side === "right";
						const orderedPack = pack;

						orderedPack.forEach((indi) => {
							if (!indi) {
								return;
							}

							const rawChildren =
								indi
									?.getChildren()
									.orderBy(BIRTH_ASC)
									.values() ?? [];

							const children = rawChildren.reduce<
								Array<IndiType | undefined>
							>((acc, item, index) => {
								if (
									item!.id &&
									!newGenerations.existed[item!.id]
								) {
									newGenerations.existed[item!.id] =
										Existed.YES;

									const childSpouses = (
										item?.getCoParents().values() ?? []
									).filter((childSpouse) => {
										if (
											childSpouse!.id &&
											!newGenerations.existed[
												childSpouse!.id
											]
										) {
											newGenerations.existed[
												childSpouse!.id
											] = Existed.YES;
											return true;
										}

										return false;
									}) as IndiType[];

									if (childSpouses.length) {
										const newValue = item?.isMale()
											? [item, ...childSpouses]
											: [...childSpouses, item];

										return [
											...acc,
											...(index > 0 &&
											newValue.length > 1 &&
											acc[acc.length - 1] !== undefined
												? [undefined]
												: []),
											...newValue,
											...(index <
												rawChildren.length - 1 &&
											newValue.length > 1
												? [undefined]
												: []),
										];
									}

									return [...acc, item];
								}

								return acc;
							}, []) as Array<IndiType | undefined>;

							const childMethod = "push";

							const members: Array<
								Array<IndiType | undefined> | undefined
							> = [];
							if (children.length) {
								members[childMethod](children);
							}

							if (toRight) {
								genealogyGenerations[prevGen].right.push(
									...members
								);
							} else {
								genealogyGenerations[prevGen].left.push(
									...members
								);
							}
						});
					});
				}

				if (genealogyGenerations[prevGen]) {
					genealogyGenerations[prevGen] = {
						left: [],
						main: {
							left: [
								...(genealogyGenerations[prevGen]?.left ?? []),
								...(genealogyGenerations[prevGen]?.main.left ??
									[]),
							],
							right: [
								...(genealogyGenerations[prevGen]?.main.right ??
									[]),
								...(genealogyGenerations[prevGen]?.right ?? []),
							],
						},
						right: [],
					};
				}
				genealogyResult[gen] = {
					left: [
						...(genealogyGenerations[gen]?.left ?? []),
						...(genealogyGenerations[gen]?.main.left ?? []),
					],
					right: [
						...(genealogyGenerations[gen]?.main.right ?? []),
						...(genealogyGenerations[gen]?.right ?? []),
					],
				};
			});
		});

		const result: Array<MemberSide<IndiType, { gen: number }>> = [];

		gens.forEach((genIndex) => {
			result.unshift({
				gen: Number(genIndex),
				...genealogyResult[Number(genIndex)],
			});
		});

		return result;
	}

	ancestryLink() {
		const www = this._gedcom?.HEAD?.SOUR?.CORP?.WWW?.value;
		const tree = this.getAncestryTreeId();

		if (this.id) {
			return `https://${www}/family-tree/person/tree/${tree}/person/${this.id.replace(
				/@|I/g,
				""
			)}/facts`;
		}
	}

	async ancestryMedia(namespace?: string | number): Promise<MediaList> {
		const list: MediaList = {};
		const objIds = this.get("OBJE")?.toValueList().keys() ?? [];
		const www = this._gedcom?.HEAD?.SOUR?.CORP?.WWW?.value;
		const tree = this.getAncestryTreeId();

		await Promise.all(
			objIds.map(async (objId) => {
				const key = objId as ObjeKey;
				const obje = this._gedcom
					?.obje(key)
					?.standardizeMedia(namespace, true, (ns, iId) => {
						return ns && iId
							? `https://mediasvc.ancestry.com/v2/image/namespaces/${ns}/media/${iId}?client=trees-mediaservice&imageQuality=hq`
							: undefined;
					});

				const media = obje?.RIN?.value;
				const clone = obje?.get("_CLON._OID")?.toValue() as
					| string
					| undefined;
				const mser = obje?.get("_MSER._LKID")?.toValue() as
					| string
					| undefined;
				let url = obje?.get("FILE")?.toValue() as string | undefined;
				const title =
					(obje?.get("TITL")?.toValue() as string | undefined) ?? "";
				const type =
					(obje?.get("FORM")?.toValue() as string | undefined) ??
					"raw";

				const imgId = clone || mser;

				if (!www || !tree || !this.id) {
					return;
				}

				if (!namespace && !url) {
					try {
						const mediaDetailsResponse = await fetch(
							`https://www.ancestry.com/api/media/viewer/v2/trees/${tree}/media?id=${media}`
						);
						const mediaDetails =
							(await mediaDetailsResponse.json()) as AncestryMedia;
						if (mediaDetails.url) {
							url = `${mediaDetails.url}&imageQuality=hq`;
						}
					} catch (_e) {
						//
					}

					url =
						url ||
						`https://${www}/mediaui-viewer/tree/${tree}/media/${media}`;
				}

				if (url && imgId) {
					const id = `${tree}-${this.id}-${imgId}`;
					list[id] = {
						key,
						id,
						tree,
						imgId,
						person: this.id!,
						title: title as string,
						url,
						contentType: type as string,
						downloadName: `${this.id!.replaceAll("@", "")}_${
							this.toNaturalName()!.replaceAll(" ", "-") || ""
						}_${(
							(title as string) ||
							key.replaceAll("@", "").toString()
						).replaceAll(" ", "-")}`,
					};
				}
			})
		);

		return list;
	}

	myheritageLink(poolId = 0) {
		const www = this._gedcom?.HEAD?.SOUR?.CORP?.value
			?.toLowerCase()
			.replace(/^www\./gi, "");
		const site = this.getMyHeritageTreeId();
		const file = (
			this._gedcom?.HEAD?.get("FILE")?.toValue() as string | undefined
		)?.match(/Exported by MyHeritage.com from .+ in (?<site>.+) on .+$/)
			?.groups?.site;
		const normalizedFile = file
			?.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-");

		if (normalizedFile && this.id) {
			const id = Number(this.id.replace(/@|I/g, "")) + poolId;
			return `https://www.${www}/site-family-tree-${site}/${normalizedFile}#!profile-${id}-info`;
		}
	}

	myheritageMedia() {
		const list: MediaList = {};

		const tree = this.getMyHeritageTreeId();

		if (!tree) {
			return;
		}

		const birthObj = this.get("BIRT.OBJE")?.toList().values();
		const deathObj = this.get("DEAT.OBJE")?.toValueList().values();

		const familiesObj = (this.get("FAMS")?.toValueList().values() ?? [])
			.concat(this.get("FAMC")?.toValueList().values() ?? [])
			.map((fam) => {
				return fam?.get("MARR.OBJE") as ObjeType | undefined;
			});

		(birthObj ?? [])
			.concat(deathObj ?? [])
			.concat(familiesObj ?? [])
			.forEach((o, index) => {
				if (!o) {
					return;
				}

				const obje = o as ObjeType;
				const key = `@O${index}@`;

				obje.standardizeMedia();

				const url = obje?.get("FILE")?.toValue() as string | undefined;
				const title =
					(obje?.get("NOTE")?.toValue() as string | undefined) ?? "";
				const type =
					(obje?.get("FORM")?.toValue() as string | undefined) ??
					"raw";

				const imgId = obje?.get("_PHOTO_RIN")?.toValue() as
					| string
					| undefined;

				if (url && imgId) {
					const id = `${tree}-${this.id}-${imgId}`;
					list[id] = {
						key,
						id,
						tree,
						imgId,
						person: this.id!,
						title: title as string,
						url,
						contentType: type as string,
						downloadName: `${this.id!.replaceAll("@", "")}_${
							this.toNaturalName()!.replaceAll(" ", "-") || ""
						}_${(
							(title as string) ||
							key.replaceAll("@", "").toString()
						).replaceAll(" ", "-")}`,
					};
				}
			});
		return list;
	}

	familySearchLink() {
		// Get the _FS_LINK custom tag value and return it as-is
		return this.get("_FS_LINK")?.toValue() as string | undefined;
	}

	async multimedia(
		namespace?: string | number
	): Promise<MediaList | undefined> {
		if (this?.isAncestry()) {
			return await this.ancestryMedia(namespace);
		}

		if (this?.isMyHeritage()) {
			return this.myheritageMedia();
		}

		return undefined;
	}

	link(poolId?: number) {
		if (this?.isAncestry()) {
			return this.ancestryLink();
		}

		if (this?.isMyHeritage()) {
			return this.myheritageLink(poolId);
		}

		if (this?.isFamilySearch()) {
			return this.familySearchLink();
		}

		return undefined;
	}

	toFamilies(list?: List): Families {
		const families = new Families();

		list?.forEach((fam, famId) => {
			const family = fam?.ref as FamType | undefined;

			if (family) {
				families.item(famId as FamKey, family);
			}
		});

		return families;
	}

	getFamilies(type: "FAMC" | "FAMS") {
		return this.toFamilies(this.get(type)?.toValueList());
	}

	getFamiliesBiologicalFirst(type: "FAMC" | "FAMS") {
		const families = this.toFamilies(this.get(type)?.toValueList());

		return families.orderBy((famB, _famBKey, famA) => {
			const husbA = famA.getHusband().index(0);
			const wifeA = famA.getWife().index(0);
			const husbAType = husbA && this.getParentType(husbA);
			const wifeAType = wifeA && this.getParentType(wifeA);

			const husbB = famB.getHusband().index(0);
			const wifeB = famB.getWife().index(0);
			const husbBType = husbB && this.getParentType(husbB);
			const wifeBType = wifeB && this.getParentType(wifeB);

			if (
				husbAType === RelationType.BIOLOGICAL &&
				wifeAType === RelationType.BIOLOGICAL
			) {
				if (
					husbBType === RelationType.BIOLOGICAL &&
					wifeBType === RelationType.BIOLOGICAL
				) {
					return 0;
				}
				return 1;
			} else if (husbAType === RelationType.BIOLOGICAL) {
				if (
					husbBType === RelationType.BIOLOGICAL &&
					wifeBType === RelationType.BIOLOGICAL
				) {
					return -1;
				} else if (husbBType === RelationType.BIOLOGICAL) {
					return 0;
				}
				return 1;
			} else if (wifeAType === RelationType.BIOLOGICAL) {
				if (
					husbBType === RelationType.BIOLOGICAL &&
					wifeBType === RelationType.BIOLOGICAL
				) {
					return -1;
				} else if (husbBType === RelationType.BIOLOGICAL) {
					return -1;
				}
				return 0;
			}

			if (
				husbBType === RelationType.BIOLOGICAL ||
				wifeBType === RelationType.BIOLOGICAL
			) {
				return -1;
			}

			return 0;
		});
	}

	isDead() {
		return (
			this.get("DEAT.DATE")?.toValue() !== undefined ||
			this.get("DEAT.PLAC")?.toValue() !== undefined
		);
	}

	isEmpty() {
		if (this._isEmpty !== undefined) {
			return this._isEmpty;
		}

		const keysLength = Object.keys(this).filter((key) => {
			return (
				!key.startsWith("_") &&
				!["gedcom", "isListable", "refType"].includes(key)
			);
		}).length;

		this._isEmpty = !keysLength;

		return this._isEmpty;
	}

	isUnknownAncestor() {
		if (this._isUnknownAncestor !== undefined) {
			return this._isUnknownAncestor;
		}

		this._isUnknownAncestor = !!this.get("_MTTAG")
			?.toList()
			?.values()
			.find(
				(tag) =>
					tag?.get("NAME")?.toValue() === CustomTags.UnknownAncestor
			);

		return this._isUnknownAncestor;
	}

	isIgnoredMember() {
		if (this._isIgnoredPerson !== undefined) {
			return this._isIgnoredPerson;
		}

		this._isIgnoredPerson = !!this.get("_MTTAG")
			?.toList()
			?.values()
			.find(
				(tag) =>
					tag?.get("NAME")?.toValue() === CustomTags.IgnoredMember
			);

		return this._isIgnoredPerson;
	}

	isUnattachedMember() {
		if (this._isUnattachedMember !== undefined) {
			return this._isUnattachedMember;
		}

		this._isUnattachedMember = !!this.get("_MTTAG")
			?.toList()
			?.values()
			.find(
				(tag) =>
					tag?.get("NAME")?.toValue() === CustomTags.UnattachedMember
			);

		return this._isUnattachedMember;
	}

	isOrphanFamilyMember() {
		if (this._isOrphanFamilyMember !== undefined) {
			return this._isOrphanFamilyMember;
		}

		// Check if any of the person's families (FAMC or FAMS) has the _IS_ORPHAN_FAMILY tag
		const famcFamilies = this.getFamilies("FAMC");
		const famsFamilies = this.getFamilies("FAMS");

		this._isOrphanFamilyMember = false;

		// Check FAMC families
		famcFamilies.forEach((fam) => {
			if (fam._IS_ORPHAN_FAMILY?.value === "Y") {
				this._isOrphanFamilyMember = true;
			}
		});

		// Check FAMS families if not already found
		if (!this._isOrphanFamilyMember) {
			famsFamilies.forEach((fam) => {
				if (fam._IS_ORPHAN_FAMILY?.value === "Y") {
					this._isOrphanFamilyMember = true;
				}
			});
		}

		return this._isOrphanFamilyMember;
	}

	isUnknownGivenname() {
		if (this._isUnknownGivenname !== undefined) {
			return this._isUnknownGivenname;
		}

		this._isUnknownGivenname = !!this.get("_MTTAG")
			?.toList()
			?.values()
			.find(
				(tag) =>
					tag?.get("NAME")?.toValue() === CustomTags.UnknownGivenname
			);
		return this._isUnknownGivenname;
	}

	isUnknownSurname() {
		if (this._isUnknownSurname !== undefined) {
			return this._isUnknownSurname;
		}

		this._isUnknownSurname = !!this.get("_MTTAG")
			?.toList()
			?.values()
			.find(
				(tag) =>
					tag?.get("NAME")?.toValue() === CustomTags.UnknownSurname
			);
		return this._isUnknownSurname;
	}

	isNonRelevantMember() {
		return this.isUnknownAncestor() || this.isUnattachedMember();
	}

	isMale() {
		return this.get("SEX")?.toValue() === "M";
	}

	isFemale() {
		return this.get("SEX")?.toValue() === "F";
	}

	isUnknownSex() {
		return !this.isMale() && !this.isFemale();
	}

	getParentType(id: IndiType | IndiKey) {
		let indi: IndiType | undefined;
		if (typeof id === "string" || typeof id === "number") {
			indi = this._gedcom?.indi(id);
		} else {
			indi = id;
		}

		if (!indi?.id || !this.id) {
			return;
		}

		const parents = this.getParents();

		let parent = parents.item(indi.id) ? indi : undefined;
		let child = this._gedcom?.indi(this.id);

		if (!parent?.id) {
			const children = this.getChildren();

			if (children.item(indi.id)) {
				parent = this._gedcom?.indi(this.id);
				child = indi;
			}
		}

		const familiesOfChildren = child?.get("FAMC")?.toValueList();
		if (!parent?.id || !child?.id || !familiesOfChildren) {
			return;
		}

		const families = this.toFamilies(familiesOfChildren);

		let childType = "";
		families.forEach((family) => {
			if (childType) {
				return;
			}
			const fatherId = family.get("HUSB")?.toValue() as
				| IndiKey
				| undefined;
			const motherId = family.get("WIFE")?.toValue() as
				| IndiKey
				| undefined;

			const usedRel =
				parent?.id === fatherId
					? "_FREL"
					: parent?.id === motherId
						? "_MREL"
						: undefined;

			if (!usedRel || !child?.id) {
				return;
			}

			const famChild =
				this.id && family.CHIL?.toValueList().item(child.id);

			if (!famChild) {
				const childIndi = this._gedcom?.indi(child.id as IndiKey);
				const childState = childIndi
					?.get("FAMC")
					?.toList()
					?.filter((item) => item.value === family.id)
					.index(0);

				childType =
					(childState?.get("PEDI")?.toValue() as string) ||
					RelationType.BIOLOGICAL;
			} else {
				childType =
					(famChild.get(usedRel)?.toValue() as string) ||
					RelationType.BIOLOGICAL;
			}
		});

		return (
			childType || RelationType.BIOLOGICAL
		).toLowerCase() as RelationType;
	}

	hasFacts() {
		const dates = dateFormatter(this, true);

		if (dates.inArray.length) {
			return true;
		}

		const facts = this.getFacts(1);

		return !!facts.length;
	}

	getLinks() {
		return this.get("_WLNK")?.toList() as
			| List<IdType, Required<IIndividualStructure>["_WLNK"]>
			| undefined;
	}

	getAkas(limit?: number) {
		return this.getFacts(limit, "AKA");
	}

	getFacts(limit?: number, filter?: MultiTag | MultiTag[]) {
		const filters = (Array.isArray(filter) ? filter : [filter]).filter(
			Boolean
		);
		const facts = new List();
		let id = 0;
		ALLOWED_FACTS.forEach((fact) => {
			const isCustom = ["EVEN", "FACT"].includes(fact);
			if (filters.length && !filters.includes(fact) && !isCustom) {
				return;
			}

			const factCommon = this.get(fact);
			const factCommons = factCommon?.toList();

			factCommons?.forEach((common, _, index) => {
				if (limit !== undefined && index >= limit) {
					return;
				}

				if (!common) {
					return;
				}

				const newCommon = createCommon(
					this._gedcom,
					`${id}` as IdType,
					this
				);
				Object.assign(newCommon, common, { id: id });

				const type = (
					isCustom ? newCommon.get("TYPE")?.toValue() : fact
				) as MultiTag | undefined;

				if (!type || DISALLOWED_CUSTOM_FACTS.includes(type)) {
					return;
				}

				if (filters.length && !filters.includes(type) && isCustom) {
					return;
				}

				const label = createCommon(this._gedcom, undefined, this);
				const customRenderer = CustomFactRenderers[type];

				if (customRenderer) {
					customRenderer(label, newCommon, this);
				} else {
					label.value = type;
					newCommon.set("_LABEL", label);
				}
				// common.id = common.id || (`${id}` as IdType);
				id++;

				facts.append(newCommon);
			});
		});

		return facts.orderBy(DATE_ASC);
	}

	commonAncestor(
		person?: IndiKey | IndiType,
		options?: {
			breakAfterSpouse?: boolean;
			breakAfterNonBiological?: boolean;
		}
	): IndiType | undefined {
		const path = this.path(person, options);

		let wentUp = false;
		const wentDown = false;
		let lastItem: PathItem | undefined;
		let ancestor: IndiType | undefined;

		path?.forEach((item) => {
			if (wentDown) {
				return;
			}

			if (lastItem) {
				if (item.level > lastItem.level) {
					wentUp = true;
				}
				if (item.level < lastItem.level) {
					wentUp = true;

					if (wentUp && !ancestor) {
						ancestor = lastItem.indi;
					}
				}
			}
			lastItem = item;
		});

		return ancestor;
	}

	path(
		person?: IndiKey | IndiType,
		options?: {
			breakAfterSpouse?: boolean;
			breakAfterNonBiological?: boolean;
		}
	): ReducedPath | undefined {
		const { breakAfterSpouse = true, breakAfterNonBiological } =
			options ?? {};
		const usedIndi =
			typeof person === "string" ? this._gedcom?.indi(person) : person;

		if (!this.id || !usedIndi?.id) {
			return;
		}

		const cacheKey = `${this.id}|${usedIndi.id}` as `${IndiKey}|${IndiKey}`;
		const cache = pathCache(cacheKey);
		if (cache) {
			return cache;
		}

		const visited = new Individuals().append(this);

		const mainItem: PathItem = {
			indi: this,
			level: 0,
			levelUp: 0,
			levelDown: 0,
			degree: 0,
			kinship: "self",
		};
		const path = [mainItem];
		if (this.id === usedIndi.id) {
			return path;
		}

		const queue: Queue = [
			{
				...mainItem,
				path,
			},
		];

		// Breadth-first search to find the shortest path
		let helper = 0;
		while (queue.length > 0) {
			if (helper++ > 1000000) {
				break;
			}

			const {
				indi,
				path,
				kinship,
				relation,
				level,
				levelUp,
				levelDown,
				degree,
				breakOnNext,
				breakAfterNext,
				inLaw,
			} = queue.shift() as QueueItem;

			if (usedIndi.id === indi.id) {
				if (breakOnNext) {
					return undefined;
				}

				pathCache(cacheKey, path);
				return path;
			}
			visited.append(indi);

			const additional: Partial<PathItem> = {};

			if (breakOnNext || breakAfterNext) {
				additional.breakOnNext = breakOnNext || breakAfterNext;
			}
			if (inLaw) {
				additional.inLaw = inLaw;
			}

			if (kinship === "spouse" && breakAfterSpouse) {
				if (path.length <= 2) {
					additional.inLaw = true;
				} else {
					additional.breakOnNext = true;
				}
			}

			// Direct relatives: Parents and Children
			if (kinship !== "child" || !breakAfterSpouse) {
				indi.getBiologicalFathers()
					.copy()
					.merge(indi.getBiologicalMothers())
					.merge(indi.getFathers().copy().merge(indi.getMothers()))
					.forEach((relative) => {
						if (!visited.has(relative)) {
							const currentRelation =
								indi.getParentType(relative);
							if (
								breakAfterNonBiological &&
								currentRelation !== RelationType.BIOLOGICAL
							) {
								additional.breakAfterNext = true;
							}

							const newItem: PathItem = {
								indi: relative,
								kinship: "parent",
								relation:
									currentRelation &&
									currentRelation !== RelationType.BIOLOGICAL
										? currentRelation
										: relation,
								level: level + 1,
								levelUp: levelUp + 1,
								levelDown,
								degree,
								...additional,
							};
							queue.push({
								...newItem,
								path: [...path, newItem],
							});
						}
					});
			}

			indi.getChildren().forEach((relative) => {
				if (!visited.has(relative)) {
					const currentRelation = relative.getParentType(indi);
					if (
						breakAfterNonBiological &&
						currentRelation !== RelationType.BIOLOGICAL
					) {
						additional.breakAfterNext = true;
					}

					const newItem: PathItem = {
						indi: relative,
						kinship: "child",
						relation:
							currentRelation &&
							currentRelation !== RelationType.BIOLOGICAL
								? currentRelation
								: relation,
						level: level - 1,
						levelUp,
						levelDown: levelDown + 1,

						degree: levelUp
							? level > 0
								? levelUp - level + 1
								: levelDown - Math.abs(level)
							: 0,
						...additional,
					};
					queue.push({
						...newItem,
						path: [...path, newItem],
					});
				}
			});

			// Spouses
			indi.getCoParents().forEach((relative) => {
				if (!visited.has(relative)) {
					const currentAddition: Partial<PathItem> = {};

					if (relation && relation !== RelationType.BIOLOGICAL) {
						currentAddition.relation = relation;
					}
					if (inLaw) {
						currentAddition.breakOnNext = true;
					}
					const newItem: PathItem = {
						indi: relative,
						kinship: "spouse",
						level,
						levelUp,
						levelDown,
						degree,
						...additional,
						...currentAddition,
					};
					queue.push({
						...newItem,
						path: [...path, newItem],
					});
				}
			});
		}

		return undefined;
	}

	kinship<T extends boolean | undefined>(
		other?: IndiKey | IndiType,
		showMainPerson?: boolean,
		lang: Language = "en",
		entirePath?: T,
		displayName: "none" | "givenname" | "surname" | "all" = "givenname"
	) {
		const KinshipTranslatorClass = getKinshipTranslatorClass();
		const translator = new KinshipTranslatorClass(
			this,
			other,
			lang,
			entirePath,
			showMainPerson ? displayName : undefined
		);

		return translator.translate<T>(showMainPerson) as
			| (T extends false | undefined
					? string
					: Array<{
							id?: IndiKey;
							gen: number;
							relative?: string;
							absolute?: string;
						}>)
			| undefined;
	}

	private isRelativeOf(
		type:
			| "fullsibling"
			| "halfsibling"
			| "sibling"
			| "parent"
			| "child"
			| "spouse"
			| "parentInLaw"
			| "childInLaw"
			| "siblingInLaw",
		indi?: IndiKey | IndiType
	) {
		const usedIndi =
			typeof indi === "string" ? this._gedcom?.indi(indi) : indi;

		let getter:
			| keyof Pick<
					IndiType,
					| "getFullSiblings"
					| "getHalfSiblings"
					| "getSiblings"
					| "getParents"
					| "getChildren"
					| "getCoParents"
					| "getSiblingsInLaw"
					| "getParentsInLaw"
					| "getChildrenInLaw"
			  >
			| undefined;
		if (type === "fullsibling") {
			getter = "getFullSiblings";
		}
		if (type === "halfsibling") {
			getter = "getHalfSiblings";
		}
		if (type === "sibling") {
			getter = "getSiblings";
		}
		if (type === "parent") {
			getter = "getParents";
		}
		if (type === "child") {
			getter = "getChildren";
		}
		if (type === "spouse") {
			getter = "getCoParents";
		}
		if (type === "siblingInLaw") {
			getter = "getSiblingsInLaw";
		}
		if (type === "parentInLaw") {
			getter = "getParentsInLaw";
		}
		if (type === "childInLaw") {
			getter = "getChildrenInLaw";
		}

		if (!usedIndi || !getter) {
			return false;
		}

		const relatives = usedIndi[getter]();

		return Boolean(
			this.id && relatives.item(this.id)
				? relatives.index(0)?.id || true
				: false
		);
	}

	isSiblingOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("sibling", indi);
	}

	isFullSiblingOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("fullsibling", indi);
	}

	isHalfSiblingOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("halfsibling", indi);
	}

	isSpouseOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("spouse", indi);
	}

	isParentOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("parent", indi);
	}

	isChildOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("child", indi);
	}

	isSiblingInLawOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("siblingInLaw", indi);
	}

	isParentInLawOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("parentInLaw", indi);
	}

	isChildInLawOf(indi?: IndiKey | IndiType) {
		return this.isRelativeOf("childInLaw", indi);
	}

	getRelativesOnDegree(degree = 0) {
		this.id = this.id || `@I${Math.random()}@`;
		const cache = relativesOnDegreeCache(this.id, degree);
		if (cache) {
			return cache;
		}

		let persons = this.getRelativesOnLevel(1)
			.getRelativesOnDegree(-1)
			.copy();
		const excludes = persons;

		if (!Math.abs(degree)) {
			return relativesOnDegreeCache(
				this.id,
				degree,
				persons.except(this)
			);
		}

		for (let i = 1; i < Math.abs(degree) + 1; i++) {
			const validDegree = i + 1;
			excludes.merge(persons);
			persons = this.getRelativesOnLevel(validDegree)
				.getRelativesOnDegree(-validDegree)
				.copy()
				.exclude(excludes);
		}

		return relativesOnDegreeCache(this.id, degree, persons);
	}

	getRelativesOnLevel(level = 0, filter?: Filter) {
		this.id = this.id || `@I${Math.random()}@`;
		const cache = relativesOnLevelCache(this.id, level);
		if (cache) {
			return cache;
		}

		let persons = new Individuals();

		const config = {
			isAscendant: level < 0,
			direction: level < 0 ? -1 : 1,
			key: level <= 0 ? "FAMS" : "FAMC",
		};
		let families = this.get(config.key as MultiTag)?.toValueList();

		if (!families) {
			return relativesOnLevelCache(this.id, level, persons);
		}

		if (filter) {
			families = families.filter(filter);
		}

		if (config.isAscendant) {
			persons = this.toFamilies(families).getChildren();
		} else {
			persons = this.toFamilies(families).getParents();
		}

		if (level >= -1 && level <= 1) {
			return relativesOnLevelCache(this.id, level, persons.except(this));
		}

		for (let i = 1; i < Math.abs(level); i++) {
			if (config.isAscendant) {
				persons = persons.getChildren();
			} else {
				persons = persons.getParents();
			}
		}

		return relativesOnLevelCache(this.id, level, persons.except(this));
	}

	getAscendants(level = 0, filter?: Filter) {
		if (!level) {
			return new Individuals();
		}

		return this.getRelativesOnLevel(level, filter);
	}

	getDescendants(level = 0, filter?: Filter) {
		if (!level) {
			return new Individuals();
		}

		return this.getRelativesOnLevel(-level, filter);
	}

	getAllDescendantsRaw(
		individuals?: Individuals,
		containDescendantsInLaw = false
	) {
		this.id = this.id || `@I${Math.random()}@`;
		let ownGeneration = new Individuals();

		if (individuals) {
			ownGeneration = individuals;
			ownGeneration.merge(this.getCoParents());
		}

		ownGeneration.append(this);

		const relatives = new Individuals();
		relatives.merge(ownGeneration);

		const generations: Record<number, Individuals | undefined> = {
			0: ownGeneration,
		};

		let currentGen = 0;
		const maxGenCheck = 100;
		while (currentGen < maxGenCheck) {
			const descentants = generations[currentGen]?.getChildren().copy();
			if (!descentants?.length) {
				break;
			}

			if (containDescendantsInLaw) {
				descentants?.merge(descentants?.getCoParents());
			}

			currentGen++;
			generations[currentGen] = descentants;

			relativesOnLevelCache(this.id, -currentGen, descentants);

			descentants && relatives.merge(descentants);
		}

		return { relatives, generations };
	}

	getAllDescendants(
		individuals?: Individuals,
		containDescendantsInLaw = false
	) {
		const raw = this.getAllDescendantsRaw(
			individuals,
			containDescendantsInLaw
		);

		return raw.relatives;
	}

	getAllAscendantsRaw(individuals?: Individuals) {
		this.id = this.id || `@I${Math.random()}@`;
		let ownGeneration = new Individuals();

		if (individuals) {
			ownGeneration = individuals;
		}

		ownGeneration.append(this);
		const relatives = new Individuals();
		relatives.merge(ownGeneration);

		const generations: Record<number, Individuals | undefined> = {
			0: ownGeneration,
		};

		let currentGen = 0;
		const maxGenCheck = 100;
		while (currentGen < maxGenCheck) {
			const parents = generations[currentGen]?.getParents().copy();
			if (!parents?.length) {
				break;
			}

			currentGen++;
			generations[currentGen] = parents;

			relativesOnLevelCache(this.id, currentGen, parents);

			parents && relatives.merge(parents);
		}

		return { relatives, generations };
	}

	getAllAscendants(individuals?: Individuals) {
		const raw = this.getAllAscendantsRaw(individuals);

		return raw.relatives;
	}

	getHalfSiblings() {
		const siblings = this.getSiblings();

		const ownParents = this.getBiologicalParents();

		const halfSiblings = new Individuals();

		siblings.forEach((sibling) => {
			const siblingsParents = sibling.getBiologicalParents();

			const inter = ownParents.intersection(siblingsParents);

			if (inter.length < ownParents.length) {
				halfSiblings.append(sibling);
			}
		});

		return halfSiblings;
	}

	getFullSiblings() {
		const siblings = this.getSiblings();

		const ownParents = this.getBiologicalParents();

		const fullSiblings = new Individuals();

		siblings.forEach((sibling) => {
			const siblingsParents = sibling.getBiologicalParents();

			const inter = ownParents.intersection(siblingsParents);

			if (inter.length === ownParents.length) {
				fullSiblings.append(sibling);
			}
		});

		return fullSiblings;
	}

	getSiblings() {
		implemented("getSiblings");
		return this.getRelativesOnDegree(0);
	}

	getBrothers() {
		implemented("getBrothers");
		return this.getSiblings().filter(Filters.MALE);
	}

	getSisters() {
		implemented("getSisters");
		return this.getSiblings().filter(Filters.MALE);
	}

	getChildren(filter?: Filter) {
		implemented("getChildren");
		return this.getDescendants(1, filter);
	}

	private getChildrenFilteredByPedigree(
		filter: RequiredFilter<"PEDI", string>
	) {
		const children = new Individuals();
		const familiesOfChildrens = this.get("FAMS")?.toValueList();

		if (!familiesOfChildrens || !this.id) {
			return children;
		}

		const families = this.toFamilies(familiesOfChildrens);

		families.forEach((family) => {
			const fatherId = family.get("HUSB")?.toValue() as
				| IndiKey
				| undefined;
			const motherId = family.get("WIFE")?.toValue() as
				| IndiKey
				| undefined;

			const usedRel =
				this.id === fatherId
					? "_FREL"
					: this.id === motherId
						? "_MREL"
						: undefined;

			if (!usedRel) {
				return;
			}

			const famChildren = this.id && family.CHIL?.toValueList();

			famChildren?.forEach((child) => {
				const childType = child.get(usedRel)?.toValue() as
					| string
					| undefined;
				if (
					(!childType && filter.PEDI === RelationType.BIOLOGICAL) ||
					childType?.toLowerCase() === filter.PEDI.toLowerCase()
				) {
					const childId = child?.toValue() as IndiKey | undefined;
					const childIndi = childId && this._gedcom?.indi(childId);
					if (childIndi) {
						children.append(childIndi);
					}
				}
			});

			if (!famChildren?.length) {
				this.getChildren().forEach((child) => {
					if (!child) {
						return;
					}
					const childState = child
						?.get("FAMC")
						?.toList()
						?.filter((item) => item.value === family.id)
						.index(0);

					const childType =
						(childState?.get("PEDI")?.toValue() as string) ||
						RelationType.BIOLOGICAL;
					if (
						(!childType &&
							filter.PEDI === RelationType.BIOLOGICAL) ||
						childType?.toLowerCase() === filter.PEDI.toLowerCase()
					) {
						children.append(child);
					}
				});
			}
		});

		return children;
	}

	getBiologicalChildren() {
		implemented("getBiologicalChildren");
		return this.getChildrenFilteredByPedigree(Filters.BIOLOGICAL);
	}

	getAdoptedChildren() {
		implemented("getAdoptedChildren");
		return this.getChildrenFilteredByPedigree(Filters.ADOPTED);
	}

	getBirthChildren() {
		implemented("getBirthChildren");
		return this.getChildrenFilteredByPedigree(Filters.BIRTH);
	}

	getFosterChildren() {
		implemented("getFosterChildren");
		return this.getChildrenFilteredByPedigree(Filters.FOSTER);
	}

	getSealingChildren() {
		implemented("getSealingChildren");
		return this.getChildrenFilteredByPedigree(Filters.SEALING);
	}

	getStepChildren() {
		implemented("getStepChildren");
		return this.getChildrenFilteredByPedigree(Filters.STEP);
	}

	getSons() {
		implemented("getSons");
		return this.getChildren().filter(Filters.MALE);
	}

	getBiologicalSons() {
		implemented("getBiologicalSons");
		return this.getChildrenFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.MALE
		);
	}

	getAdoptedSons() {
		implemented("getAdoptedSons");
		return this.getAdoptedChildren().filter(Filters.MALE);
	}

	getBirthSons() {
		implemented("getBirthSons");
		return this.getBirthChildren().filter(Filters.MALE);
	}

	getFosterSons() {
		implemented("getFosterSons");
		return this.getFosterChildren().filter(Filters.MALE);
	}

	getSealingSons() {
		implemented("getSealingSons");
		return this.getSealingChildren().filter(Filters.MALE);
	}

	getStepSons() {
		implemented("getStepSons");
		return this.getStepChildren().filter(Filters.MALE);
	}

	getDaughters() {
		implemented("getDaughters");
		return this.getChildren().filter(Filters.FEMALE);
	}

	getBiologicalDaugthers() {
		implemented("getBiologicalDaugthers");
		return this.getChildrenFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.FEMALE
		);
	}

	getAdoptedDaughters() {
		implemented("getAdoptedDaughters");
		return this.getAdoptedChildren().filter(Filters.FEMALE);
	}

	getBirthDaughters() {
		implemented("getBirthDaughters");
		return this.getBirthChildren().filter(Filters.FEMALE);
	}

	getFosterDaughters() {
		implemented("getFosterDaughters");
		return this.getFosterChildren().filter(Filters.FEMALE);
	}

	getSealingDaughters() {
		implemented("getSealingDaughters");
		return this.getSealingChildren().filter(Filters.FEMALE);
	}

	getStepDaughters() {
		implemented("getStepDaughters");
		return this.getStepChildren().filter(Filters.FEMALE);
	}

	getParents(filter?: Filter) {
		implemented("getParents");
		return this.getAscendants(1, filter);
	}

	private getParentsFilteredByPedigree(
		filter: RequiredFilter<"PEDI", string>
	) {
		const parents = new Individuals();
		const familiesOfParents = this.get("FAMC")?.toValueList();

		if (!familiesOfParents || !this.id) {
			return parents;
		}

		const families = this.toFamilies(familiesOfParents);

		families.forEach((family) => {
			const child = this.id && family.CHIL?.toValueList()?.item(this.id);

			if (!child) {
				const childState = this?.get("FAMC")
					?.toList()
					?.filter((item) => item.value === family.id)
					.index(0);

				const parentType =
					(childState?.get("PEDI")?.toValue() as string) ||
					RelationType.BIOLOGICAL;
				if (
					(!parentType && filter.PEDI === RelationType.BIOLOGICAL) ||
					parentType?.toLowerCase() === filter.PEDI.toLowerCase()
				) {
					parents.merge(family.getParents());
				}
				return;
			}

			const fatherType = child.get("_FREL")?.toValue() as
				| string
				| undefined;
			const motherType = child.get("_MREL")?.toValue() as
				| string
				| undefined;

			if (
				(!fatherType && filter.PEDI === RelationType.BIOLOGICAL) ||
				fatherType?.toLowerCase() === filter.PEDI.toLowerCase()
			) {
				const fatherId = family.get("HUSB")?.toValue() as
					| IndiKey
					| undefined;
				const father = fatherId && this._gedcom?.indi(fatherId);

				if (father) {
					parents.append(father);
				}
			}

			if (
				(!motherType && filter.PEDI === RelationType.BIOLOGICAL) ||
				motherType?.toLowerCase() === filter.PEDI.toLowerCase()
			) {
				const motherId = family.get("WIFE")?.toValue() as
					| IndiKey
					| undefined;
				const mother = motherId && this._gedcom?.indi(motherId);
				if (mother) {
					parents.append(mother);
				}
			}
		});

		return parents;
	}

	private getSpousesFilteredByPartner(
		filter: RequiredFilter<"PART", string>
	) {
		const spouses = new Individuals();
		const familiesOfSpouses = this.get("FAMS")?.toValueList();

		if (!familiesOfSpouses || !this.id) {
			return spouses;
		}

		const families = this.toFamilies(familiesOfSpouses);

		families.forEach((family) => {
			const spouseType = family.get("_SREL")?.toValue() as
				| string
				| undefined;

			if (
				(!spouseType && filter.PART === PartnerType.SPOUSE) ||
				spouseType?.toLowerCase() === filter.PART.toLowerCase()
			) {
				const spouse = family.getParents().copy().except(this).index(0);

				if (spouse) {
					spouses.append(spouse);
				}
			}
		});

		return spouses;
	}

	getBiologicalParents() {
		implemented("getBiologicalParents");
		return this.getParentsFilteredByPedigree(Filters.BIOLOGICAL);
	}

	getAdoptedParents() {
		implemented("getAdoptedParents");
		return this.getParentsFilteredByPedigree(Filters.ADOPTED);
	}

	getBirthParents() {
		implemented("getBirthParents");
		return this.getParentsFilteredByPedigree(Filters.BIRTH);
	}

	getFosterParents() {
		implemented("getFosterParents");
		return this.getParentsFilteredByPedigree(Filters.FOSTER);
	}

	getSealingParents() {
		implemented("getSealingParents");
		return this.getParentsFilteredByPedigree(Filters.SEALING);
	}

	getStepParents() {
		implemented("getStepParents");
		return this.getParentsFilteredByPedigree(Filters.STEP);
	}

	getFathers() {
		implemented("getFathers");
		return this.getParents().filter(Filters.MALE);
	}

	getBiologicalFathers() {
		implemented("getBiologicalFathers");
		return this.getParentsFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.MALE
		);
	}

	getAdoptedFathers() {
		implemented("getAdoptedFathers");
		return this.getParentsFilteredByPedigree(Filters.ADOPTED).filter(
			Filters.MALE
		);
	}

	getBirthFathers() {
		implemented("getBirthFathers");
		return this.getParentsFilteredByPedigree(Filters.BIRTH).filter(
			Filters.MALE
		);
	}

	getFosterFathers() {
		implemented("getFosterFathers");
		return this.getParentsFilteredByPedigree(Filters.FOSTER).filter(
			Filters.MALE
		);
	}

	getSealingFathers() {
		implemented("getSealingFathers");
		return this.getParentsFilteredByPedigree(Filters.SEALING).filter(
			Filters.MALE
		);
	}

	getStepFathers() {
		implemented("getStepFathers");
		return this.getParentsFilteredByPedigree(Filters.STEP).filter(
			Filters.MALE
		);
	}

	getMothers() {
		implemented("getMothers");
		return this.getParents().filter(Filters.FEMALE);
	}

	getBiologicalMothers() {
		implemented("getBiologicalMothers");
		return this.getParentsFilteredByPedigree(Filters.BIOLOGICAL).filter(
			Filters.FEMALE
		);
	}

	getAdoptedMothers() {
		implemented("getAdoptedMothers");
		return this.getParentsFilteredByPedigree(Filters.ADOPTED).filter(
			Filters.FEMALE
		);
	}

	getBirthMothers() {
		implemented("getBirthMothers");
		return this.getParentsFilteredByPedigree(Filters.BIRTH).filter(
			Filters.FEMALE
		);
	}

	getFosterMothers() {
		implemented("getFosterMothers");
		return this.getParentsFilteredByPedigree(Filters.FOSTER).filter(
			Filters.FEMALE
		);
	}

	getSealingMothers() {
		implemented("getSealingMothers");
		return this.getParentsFilteredByPedigree(Filters.SEALING).filter(
			Filters.FEMALE
		);
	}

	getStepMothers() {
		implemented("getStepMothers");
		return this.getParentsFilteredByPedigree(Filters.STEP).filter(
			Filters.FEMALE
		);
	}

	getCoParents() {
		implemented("getCoParents");
		return this.getRelativesOnLevel(0);
	}

	getSpouses() {
		implemented("getCertifiedSpouses");
		return this.getSpousesFilteredByPartner(Filters.SPOUSE);
	}

	getPartners() {
		implemented("getPartners");
		return this.getSpousesFilteredByPartner(Filters.PARTNER);
	}

	getFriends() {
		implemented("getFriends");
		return this.getSpousesFilteredByPartner(Filters.FRIEND);
	}

	getWives() {
		implemented("getWives");
		return this.getCoParents().filter(Filters.FEMALE);
	}

	getHusbands() {
		implemented("getHusbands");
		return this.getCoParents().filter(Filters.MALE);
	}

	getCousins() {
		implemented("getCousins");
		return this.getRelativesOnDegree(1);
	}

	getGrandParents() {
		implemented("getGrandParents");
		return this.getAscendants(2);
	}

	getGrandFathers() {
		implemented("getGrandFathers");
		return this.getGrandParents().filter(Filters.MALE);
	}

	getGrandMothers() {
		implemented("getGrandMothers");
		return this.getGrandParents().filter(Filters.FEMALE);
	}

	getGrandChildren() {
		implemented("getGrandChildren");
		return this.getDescendants(2);
	}

	getGrandSons() {
		implemented("getGrandSons");
		return this.getGrandChildren().filter(Filters.MALE);
	}

	getGrandDaughters() {
		implemented("getGrandDaughters");
		return this.getGrandChildren().filter(Filters.FEMALE);
	}

	getGreatGrandParents() {
		implemented("getGreatGrandParents");
		return this.getAscendants(3);
	}

	getGreatGrandFathers() {
		implemented("getGreatGrandFathers");
		return this.getGreatGrandParents().filter(Filters.MALE);
	}

	getGreatGrandMothers() {
		implemented("getGreatGrandMothers");
		return this.getGreatGrandParents().filter(Filters.FEMALE);
	}

	getGreatGrandChildren() {
		implemented("getGreatGrandChildren");
		return this.getDescendants(3);
	}

	getGreatGrandSons() {
		implemented("getGreatGrandSons");
		return this.getGreatGrandChildren().filter(Filters.MALE);
	}

	getGreatGrandDaughters() {
		implemented("getGreatGrandDaughters");
		return this.getGreatGrandChildren().filter(Filters.FEMALE);
	}

	getAuncles() {
		implemented("getAuncles");

		return this.getParents().getSiblings();
	}

	getAunts() {
		implemented("getAunts");
		return this.getAuncles().filter(Filters.FEMALE);
	}

	getUncles() {
		implemented("getUncles");
		return this.getAuncles().filter(Filters.MALE);
	}

	getNiblings() {
		implemented("getNiblings");
		return this.getSiblings().getChildren();
	}

	getNieces() {
		implemented("getNieces");
		return this.getNiblings().filter(Filters.FEMALE);
	}

	getNephews() {
		implemented("getNephews");
		return this.getNiblings().filter(Filters.MALE);
	}

	getParentsInLaw() {
		implemented("getParentsInLaw");
		return this.getCoParents().getParents();
	}

	getFathersInLaw() {
		implemented("getFathersInLaw");
		return this.getParentsInLaw().filter(Filters.MALE);
	}

	getMothersInLaw() {
		implemented("getMothersInLaw");
		return this.getParentsInLaw().filter(Filters.FEMALE);
	}

	getSiblingsInLaw() {
		implemented("getSiblingsInLaw");
		return this.getCoParents()
			.copy()
			.getSiblings()
			.copy()
			.merge(this.getSiblings().getCoParents());
	}

	getBrothersInLaw() {
		implemented("getBrothersInLaw");
		return this.getSiblingsInLaw().filter(Filters.MALE);
	}

	getSistersInLaw() {
		implemented("getSistersInLaw");
		return this.getSiblingsInLaw().filter(Filters.FEMALE);
	}

	getChildrenInLaw() {
		implemented("getChildrenInLaw");
		return this.getChildren().getCoParents();
	}

	getSonsInLaw() {
		implemented("getSonsInLaw");
		return this.getChildrenInLaw().filter(Filters.MALE);
	}

	getDaughtersInLaw() {
		implemented("getDaughtersInLaw");
		return this.getChildrenInLaw().filter(Filters.FEMALE);
	}

	// These are generated automatically
	get2ndCousins() {
		return new Individuals();
	}

	get2ndGreatGrandParents() {
		return new Individuals();
	}

	get2ndGreatGrandChildren() {
		return new Individuals();
	}

	get3rdCousins() {
		return new Individuals();
	}

	get3rdGreatGrandParents() {
		return new Individuals();
	}

	get3rdGreatGrandChildren() {
		return new Individuals();
	}

	get4thCousins() {
		return new Individuals();
	}

	get4thGreatGrandParents() {
		return new Individuals();
	}

	get4thGreatGrandChildren() {
		return new Individuals();
	}

	get5thCousins() {
		return new Individuals();
	}

	get5thGreatGrandParents() {
		return new Individuals();
	}

	get5thGreatGrandChildren() {
		return new Individuals();
	}

	get6thCousins() {
		return new Individuals();
	}

	get6thGreatGrandParents() {
		return new Individuals();
	}

	get6thGreatGrandChildren() {
		return new Individuals();
	}

	get7thCousins() {
		return new Individuals();
	}

	get7thGreatGrandParents() {
		return new Individuals();
	}

	get7thGreatGrandChildren() {
		return new Individuals();
	}

	get8thCousins() {
		return new Individuals();
	}

	get8thGreatGrandParents() {
		return new Individuals();
	}

	get8thGreatGrandChildren() {
		return new Individuals();
	}

	get9thCousins() {
		return new Individuals();
	}

	get9thGreatGrandParents() {
		return new Individuals();
	}

	get9thGreatGrandChildren() {
		return new Individuals();
	}
}

const generateFunctions = () => {
	const levels: number[] = [2, 3, 4, 5, 6, 7, 8, 9];
	const types: Array<[GeneratorType, number, "level" | "degree"]> = [
		["Cousins", 0, "degree"],
		["GreatGrandParents", 2, "level"],
		["GreatGrandChildren", -2, "level"],
	];

	levels.forEach((level) => {
		types.forEach(([type, starting, direction]) => {
			let validLevel: GeneratorKey;

			if (level === 2) {
				validLevel = "2nd";
			} else if (level === 3) {
				validLevel = "3rd";
			} else {
				validLevel = `${level}th` as GeneratorKey;
			}
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			Indi.prototype[`get${validLevel}${type}`] = function (
				filter?: Filter
			) {
				if (direction === "level" && starting < 0) {
					return this.getRelativesOnLevel(-level + starting, filter);
				} else if (direction === "level" && starting > 0) {
					return this.getRelativesOnLevel(level + starting, filter);
				}

				return this.getRelativesOnDegree(level + starting);
			};
		});
	});
};

generateFunctions();

export type IndiType = Indi & IIndividualStructure & GeneratedIndiMethods;

export interface TreeMember<T = IndiType> {
	id: FamKey | IndiKey;
	index: number;
	father?: T;
	mother?: T;
	fatherSpouses?: T[];
	motherSpouses?: T[];
}

export type GenealogyMember<T = IndiType> = TreeMember<T> & {
	fatherSiblings?: T[];
	motherSiblings?: T[];
};
export interface IndiTree<T = IndiType> {
	existed: Record<IndiKey, Existed | undefined>;
	tree: Record<number, Array<TreeMember<T> | undefined>>;
	halves: Record<number, number | undefined>;
	lastItems: Record<number, TreeMember<T> | undefined>;
}

export type IndiGenealogy<T = IndiType> = Pick<
	IndiTree<T>,
	"existed" | "halves" | "lastItems"
> & {
	tree: Record<number, Array<GenealogyMember<T> | undefined>>;
};

export interface IndiMarker<T = IndiType> {
	isPrev?: boolean;
	isNext?: boolean;
	items: Array<T | undefined>;
}

export type MemberSide<T = IndiType, O extends object = object> = {
	left: Array<Array<T | undefined> | undefined>;
	right: Array<Array<T | undefined> | undefined>;
} & O;

export type MemberMain<T = IndiType> = MemberSide<T> & {
	main: MemberSide<T>;
};

export interface GenerationSpouseType {
	indi: IndiType;
	extra?: boolean;
	normal?: boolean;
}

export interface GenerationIndiType {
	indi: IndiType;
	leftSpouses?: GenerationSpouseType[];
	rightSpouses?: GenerationSpouseType[];
}

export type IndiGenealogyGenerations<T = IndiType> = Record<
	number,
	MemberMain<T>
>;

export type IndiGenealogyResult<T = IndiType> = Record<number, MemberSide<T>>;

export type NonNullIndiGenealogyResult<T = IndiType> = Record<
	number,
	Array<Array<T | undefined>>
>;

export interface PathItem {
	indi: IndiType;
	level: number;
	levelUp: number;
	levelDown: number;
	degree: number;
	kinship: Kinship; // Kinship type with previous path item
	relation?: RelationType; // Parent relative type with previous path item
	inLaw?: boolean;
	breakOnNext?: boolean;
	breakAfterNext?: boolean;
}

export type Path = PathItem[];
export type ReducedPath = Array<
	Omit<PathItem, "breakOnNext" | "breakAfterNext">
>;

export type QueueItem = {
	path: Path;
} & PathItem;
export type Queue = QueueItem[];

export const createIndi = (
	gedcom: GedComType,
	id: IndiKey,
	main?: Common,
	parent?: Common
): ProxyOriginal<IndiType> => {
	return createProxy(
		new Indi(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<IndiType>;
};
