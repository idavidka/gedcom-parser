import difference from "lodash/difference";

import {
	BIRTH_ASC,
	BIRTH_DESC,
	DEATH_ASC,
	DEATH_DESC,
} from "../constants/orders";
import { getPlaceParserProvider } from "../factories/place-parser-provider";
import { getPlaceTranslatorProvider } from "../factories/place-translator-provider";
import { type IIndividuals } from "../interfaces/indis";
import type IEventDetailStructure from "../structures/event-detail-structure";
import { type Settings } from "../types/settings";
import {
	type IndiKey,
	type Filter,
	type FamKey,
	type OrderIterator,
	type MultiTag,
	Range,
	type NestedGroup,
	type Order,
	type FilterIterator,
	type GroupIterator,
	type Group,
} from "../types/types";
import type { GroupMarker } from "../types/types";
import { nameFormatter } from "../utils/name-formatter";
import { setNestedGroup } from "../utils/nested-group";
import { getPlaceParts } from "../utils/place-parser";
import { placeTranslator } from "../utils/place-translator";

import { type CommonDate } from "./date";
import { type IndiType } from "./indi";
import { List } from "./list";

export class Individuals
	extends List<IndiKey, IndiType>
	implements IIndividuals
{
	copy(): Individuals {
		return super.copy(Individuals) as Individuals;
	}

	except(item: IndiType): Individuals {
		return super.except(item, Individuals) as Individuals;
	}

	filter(filters: Filter | FilterIterator<IndiType, IndiKey>): Individuals {
		return super.filter(filters, Individuals) as Individuals;
	}

	find(
		filters: Filter | FilterIterator<IndiType, IndiKey>
	): IndiType | undefined {
		return super.find(filters, Individuals) as IndiType | undefined;
	}

	unattachedFilter(useUnattached: boolean) {
		if (useUnattached) {
			return this;
		}

		return this.filter((item) => !item.isUnattachedMember());
	}

	orderBy(orders: Order | OrderIterator<IndiType, IndiKey>): Individuals {
		return super.orderBy(orders, Individuals) as Individuals;
	}

	getFirstEvent() {
		const firstDeath = this.getFirstBirth();
		const firstBirth = this.getFirstDeath();

		if (
			firstBirth?.DATE?.rawValue === undefined ||
			(firstDeath?.DATE?.rawValue !== undefined &&
				firstDeath.DATE.rawValue < firstBirth.DATE.rawValue)
		) {
			return firstDeath;
		}

		return firstBirth;
	}

	getLastEvent() {
		const lastDeath = this.getLastDeath();
		const lastBirth = this.getLastBirth();

		if (
			lastDeath?.DATE?.rawValue === undefined ||
			(lastBirth?.DATE?.rawValue !== undefined &&
				lastDeath.DATE.rawValue < lastBirth.DATE.rawValue)
		) {
			return lastBirth;
		}

		return lastDeath;
	}

	getFirstBirth() {
		return this.filter((item) => {
			const birth = item.BIRT?.toList().index(0) as
				| IEventDetailStructure
				| undefined;
			if (birth?.DATE?.rawValue?.getTime() === 0) {
				return true;
			}
			return !!birth?.DATE?.rawValue?.getTime();
		})
			.orderBy(BIRTH_ASC)
			.index(0);
	}

	getLastBirth() {
		return this.filter((item) => {
			const birth = item.BIRT?.toList().index(0) as
				| IEventDetailStructure
				| undefined;
			if (birth?.DATE?.rawValue?.getTime() === 0) {
				return true;
			}
			return !!birth?.DATE?.rawValue?.getTime();
		})
			.orderBy(BIRTH_DESC)
			.index(0);
	}

	getFirstDeath() {
		return this.filter((item) => {
			const death = item.DEAT?.toList().index(0) as
				| IEventDetailStructure
				| undefined;
			if (death?.DATE?.rawValue?.getTime() === 0) {
				return true;
			}

			return !!death?.DATE?.rawValue?.getTime();
		})
			.orderBy(DEATH_ASC)
			.index(0);
	}

	getLastDeath() {
		return this.filter((item) => {
			const death = item.DEAT?.toList().index(0) as
				| IEventDetailStructure
				| undefined;
			if (death?.DATE?.rawValue?.getTime() === 0) {
				return true;
			}

			return !!death?.DATE?.rawValue?.getTime();
		})
			.orderBy(DEATH_DESC)
			.index(0);
	}

	groupBy(
		group: Group | GroupIterator<IndiType, IndiKey>,
		sort?: "length" | "group" | OrderIterator<Individuals, string>,
		minOccurance = -1,
		lessOccuranceLabel?: string
	): Record<string, Individuals> {
		return super.groupBy(
			group,
			sort as OrderIterator<List, string>,
			minOccurance,
			lessOccuranceLabel,
			Individuals
		) as Record<string, Individuals>;
	}

	groupByFirstLetters(
		sort: "length" | "group" | OrderIterator<Individuals, string> = "group",
		minOccurance = -1,
		settings?: Settings
	) {
		return this.groupBy(
			(item) => {
				const { letter } = nameFormatter(item, settings);

				return letter.trim() || "Unknown";
			},
			sort,
			minOccurance,
			"Letters appearing less than 5 times"
		);
	}

	groupBySurnames(
		sort?: "length" | "group" | OrderIterator<Individuals, string>,
		minOccurance = -1
	) {
		return this.groupBy(
			"NAME.SURN",
			sort,
			minOccurance,
			"Surnames appearing less than 5 times"
		);
	}

	groupByTimeRanges(
		range: Range,
		sort: "length" | "group" | OrderIterator<Individuals, string> = "group",
		minOccurance = -1
	) {
		return this.groupBy(
			{
				["BIRT.DATE.YEAR" as MultiTag]: {
					getter: (year: unknown) => {
						if (!Number(year)) {
							return;
						}

						if (range === Range.Year) {
							return `${
								Math.floor(Number(year) / range) * range
							}`;
						}

						return `${Math.floor(Number(year) / range) * range + 1}-${
							Math.ceil((Number(year) + 1) / range) * range
						}`;
					},
				},
			},
			sort,
			minOccurance,
			"Time ranges appearing less than 5 times"
		);
	}

	nestedGroupByPlacesAndTimeRanges(
		sort?: "length" | "group" | OrderIterator<Individuals, string>,
		minOccurance = -1,
		uniqueCounting = true
	) {
		const placesWithYear = this.groupBy(
			(item) =>
				item
					.getPlaces()
					.map((place) => {
						const date = place.obj?.get("DATE") as
							| CommonDate
							| undefined;
						if (date?.YEAR) {
							return `${place.place}, ${date.YEAR}`;
						}
						return `${place.place}, Unknown`;
					})
					.filter(Boolean) as string[],
			sort,
			minOccurance,
			"Places appearing less than 5 times"
		);

		return Object.entries(placesWithYear).reduce<NestedGroup>(
			(acc, [place, indis]) => {
				setNestedGroup(acc, place, indis, uniqueCounting);

				return acc;
			},
			{}
		);
	}

	nestedGroupByTimeRangesAndPlaces(
		sort?: "length" | "group" | OrderIterator<Individuals, string>,
		minOccurance = -1,
		uniqueCounting = true
	) {
		const placesWithYear = this.groupBy(
			(item) =>
				item
					.getPlaces()
					.map((place) => {
						const date = place.obj?.get("DATE") as
							| CommonDate
							| undefined;
						if (date?.YEAR) {
							return `${date.YEAR}, ${place.place}`;
						}
						return `Unknown, ${place.place}`;
					})
					.filter(Boolean) as string[],
			sort,
			minOccurance,
			"Places appearing less than 5 times"
		);

		return Object.entries(placesWithYear).reduce<NestedGroup>(
			(acc, [place, indis]) => {
				setNestedGroup(acc, place, indis, uniqueCounting);

				return acc;
			},
			{}
		);
	}

	nestedGroupByPlaces(
		sort?: "length" | "group" | OrderIterator<Individuals, string>,
		minOccurance = -1,
		partOrder: "original" | "reverse" = "reverse",
		translate = true,
		uniqueCounting = true,
		groupKeyTranslator?: (parts: string[]) => string | undefined
	) {
		const places = this.groupByPlaces(
			sort,
			minOccurance,
			partOrder,
			translate,
			groupKeyTranslator
		);

		return Object.entries(places).reduce<NestedGroup>(
			(acc, [place, indis]) => {
				setNestedGroup(acc, place, indis, uniqueCounting);

				return acc;
			},
			{}
		);
	}

	groupByPlaces(
		sort?: "length" | "group" | OrderIterator<Individuals, string>,
		minOccurance = -1,
		partOrder: "original" | "reverse" = "reverse",
		translate = true,
		groupKeyTranslator?: (parts: string[]) => string | undefined
	) {
		return this.groupBy(
			(item) =>
				item
					.getPlaces()
					.map((place) => {
						// Use custom place parser if provided, otherwise use built-in
						const customPlaceParser = getPlaceParserProvider();
						const placeParts = customPlaceParser
							? customPlaceParser(place.place || "")
							: getPlaceParts(place.place || "");

						const {
							leftParts = [],
							town,
							county,
							country,
						} = placeParts[0] || {};

						// Build normalized parts array in city-to-country order
						const normalizedParts = [
							...leftParts,
							town,
							county,
							country,
						].filter(Boolean) as string[];

						// Apply the requested order
						const orderedParts =
							partOrder === "original"
								? normalizedParts
								: normalizedParts.toReversed();

						let newPlace: string | undefined = "";
						if (groupKeyTranslator) {
							// Use custom group key translator function
							newPlace = groupKeyTranslator(orderedParts);
						} else if (translate) {
							// Use custom place translator if provided, otherwise use built-in
							const customPlaceTranslator =
								getPlaceTranslatorProvider();
							if (customPlaceTranslator) {
								// Custom translator: pass as array
								newPlace = customPlaceTranslator(orderedParts);
							} else {
								// Built-in translator: expects string array
								newPlace = placeTranslator(orderedParts);
							}
						} else {
							// No translation, just join
							newPlace = orderedParts.join(", ");
						}

						if (!newPlace) {
							return undefined;
						}

						return {
							marker: place.place,
							group: newPlace,
						};
					})
					.filter(Boolean) as GroupMarker[],
			sort,
			minOccurance,
			"Places appearing less than 5 times"
		);
	}

	getFacts() {
		const facts = new List();

		this.values().forEach((indi) => {
			const indiFacts = indi?.getFacts();
			if (indi?.id && indiFacts) {
				facts.merge(indiFacts);
			}
		});

		return facts;
	}

	private isRelativeOf(
		type:
			| "sibling"
			| "parent"
			| "child"
			| "spouse"
			| "parentInLaw"
			| "childInLaw",
		indi?: IndiKey | IndiType,
		every = false
	) {
		const usedIndi =
			typeof indi === "string"
				? this.index(0)?.getGedcom()?.indi(indi)
				: indi;

		let getter:
			| keyof Pick<
					IndiType,
					| "getSiblings"
					| "getParents"
					| "getChildren"
					| "getCoParents"
					| "getParentsInLaw"
					| "getChildrenInLaw"
			  >
			| undefined;
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
		const thisIds = this.keys();

		if (relatives.length <= 0 || this.length <= 0) {
			return false;
		}

		const filtered = relatives.filter({ id: thisIds });
		if (every) {
			return filtered.length === this.length
				? filtered.index(0)?.id || true
				: false;
		}

		return filtered.length > 0 ? filtered.index(0)?.id || true : false;
	}

	isSiblingOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("sibling", indi, every);
	}

	isSpouseOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("spouse", indi, every);
	}

	isParentOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("parent", indi, every);
	}

	isChildOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("child", indi, every);
	}

	isParentInLawOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("parentInLaw", indi, every);
	}

	isChildInLawOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("childInLaw", indi, every);
	}

	splitByFamily(
		type: "Spouses" | "Parents" | "Children",
		relativeTo?: IndiType
	) {
		const splittedList: Record<FamKey, Individuals | undefined> = {};

		const familiesRelativeTo =
			relativeTo
				?.get(type !== "Parents" ? "FAMS" : "FAMC")
				?.toValueList()
				.keys() ?? [];

		let lengthOfIndividuals = 0;
		this.forEach((indi) => {
			const families = indi
				.get(type === "Spouses" ? "FAMS" : "FAMC")
				?.toValueList();

			if (families) {
				families.keys().forEach((fKey) => {
					const famKey = fKey as FamKey;
					if (
						familiesRelativeTo &&
						!familiesRelativeTo.includes(famKey)
					) {
						return;
					}
					if (!splittedList[famKey]) {
						splittedList[famKey] = new Individuals();
					}

					splittedList[famKey]?.append(indi);
					lengthOfIndividuals++;
				});
			}
		});

		// Handle familiy with no co parent
		if (type === "Spouses" && relativeTo) {
			const missingFams = difference(
				familiesRelativeTo,
				Object.keys(splittedList)
			);
			if (missingFams.length) {
				missingFams.forEach((fKey) => {
					const famKey = fKey as FamKey;

					if (
						familiesRelativeTo &&
						!familiesRelativeTo.includes(famKey)
					) {
						return;
					}

					const missingChildren = relativeTo
						.getGedcom()
						?.fam(famKey)
						?.getChildren();

					if (!splittedList[famKey] && missingChildren?.length) {
						splittedList[famKey] = new Individuals();
					}
				});
			}
		}

		return {
			items: splittedList,
			lengthOfFamily: Object.keys(splittedList).length,
			lengthOfIndividuals,
		};
	}

	getRelativesOnDegree(degree = 0) {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getRelativesOnLevel(degree));
			}
		});

		return persons;
	}

	getRelativesOnLevel(level = 0, filter?: Filter) {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getRelativesOnLevel(level, filter));
			}
		});

		return persons;
	}

	getAscendants(level = 0, filter?: Filter) {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getAscendants(level, filter));
			}
		});

		return persons;
	}

	getDescendants(level = 0, filter?: Filter) {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getDescendants(level, filter));
			}
		});

		return persons;
	}

	getAllAscendants(individuals?: Individuals) {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getAllAscendants(individuals));
			}
		});

		return persons;
	}

	getAllDescendants(
		individuals?: Individuals,
		containDescendantsInLaw = false
	) {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(
					indi.getAllDescendants(individuals, containDescendantsInLaw)
				);
			}
		});

		return persons;
	}

	getSiblings() {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getSiblings());
			}
		});

		return persons;
	}

	getChildren() {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getChildren());
			}
		});

		return persons;
	}

	getParents() {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getParents());
			}
		});

		return persons;
	}

	getCoParents() {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getCoParents());
			}
		});

		return persons;
	}

	getSpouses() {
		const persons = new Individuals();

		this.values().forEach((indi) => {
			if (indi) {
				persons.merge(indi.getCoParents());
			}
		});

		return persons;
	}

	toName() {
		return super.toProp("NAME")?.toValue();
	}

	toList() {
		return new Individuals().concat(this.getItems());
	}
}
