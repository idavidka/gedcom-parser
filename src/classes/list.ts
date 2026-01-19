import { differenceBy, get, intersectionBy, set, unset } from "lodash-es";

import type {ConvertOptions} from "../interfaces/common";
import type {IList} from "../interfaces/list";
import type {OrderDefinition, IdType, Filter, FilterIterator, MultiTag, Order, OrderIterator, Group, GroupIterator, GroupDefinition, GroupMarker } from "../types/types";

import { getValidTag  } from "./common";
import type {Common} from "./common";

export class List<
	K extends IdType = IdType,
	T extends Common = Common,
> implements IList<K, T> {
	private items: Partial<Record<K, T>> = {};
	isListable = true;
	marker: string | undefined = undefined;
	// length = 0;

	constructor(items?: Partial<Record<K, T>> | T[]) {
		if (items) {
			this.concat(items);
		}
	}

	get length() {
		return this.values().length;
	}

	has(indi?: K | T) {
		return !!this.item(
			(typeof indi === "string" ? indi : (indi?.id ?? "")) as K
		);
	}

	get(name: MultiTag) {
		const propList = new List();
		(this.entries() as Array<[K, T]>).forEach(([key, item]) => {
			propList.item(key, item.get(name) as T);
		});

		return propList;
	}

	getIf(name: MultiTag, condition: string, name2: MultiTag) {
		const propList = new List();

		(this.entries() as Array<[K, T]>).forEach(([key, item]) => {
			const passedItem = item.getIf(name, condition, name2) as
				| T
				| undefined;

			if (passedItem) {
				propList.item(key, passedItem);
			}
		});

		return propList;
	}

	keys() {
		// const hasOwn = Object.prototype.hasOwnProperty;
		// const keys: K[] = [];
		// for (const k in this.items) {
		// 	if (hasOwn.call(this.items, k)) {
		// 		keys.push(k);
		// 	}
		// }

		// return keys;

		return Object.keys(this.items) as K[];
	}

	values() {
		// const hasOwn = Object.prototype.hasOwnProperty;
		// const values: Array<T | undefined> = [];
		// for (const k in this.items) {
		// 	if (hasOwn.call(this.items, k)) {
		// 		values.push(this.items[k]);
		// 	}
		// }

		// return values;

		return Object.values(this.items) as (T | undefined)[];
	}

	entries() {
		// const hasOwn = Object.prototype.hasOwnProperty;
		// const entries: Array<[K, T | undefined]> = [];
		// for (const k in this.items) {
		// 	if (hasOwn.call(this.items, k)) {
		// 		entries.push([k, this.items[k]]);
		// 	}
		// }

		// return entries;

		return Object.entries(this.items) as [K, T | undefined][];
	}

	setLength(_type?: "increase" | "decrease") {
		// THIS IS TO SLOW
		// if (!type) {
		// 	this.length = this.keys().length;
		// } else {
		// 	this.length = this.length + (type === "increase" ? 1 : -1);
		// }
	}

	first() {
		return this.index(0);
	}

	last() {
		return this.index(this.keys().length - 1);
	}

	index(index: number) {
		const keys = this.keys();
		const key = keys[index];

		return key && this.items[key];
	}

	item(name: K, value?: T) {
		if (arguments.length > 1) {
			set(this.items, name, value);

			this.setLength();
		}

		return get(this.items, name) as T | undefined;
	}

	removeItem(name: K) {
		unset(this.items, name);

		this.setLength();
	}

	exclude(excludedList: List<K, T>) {
		excludedList.keys().forEach((itemId) => {
			delete this.items[itemId as K];
		});

		this.setLength();

		return this;
	}

	concat(items?: Partial<Record<K, T>> | T[]) {
		if (Array.isArray(items)) {
			items.forEach((item) => {
				this.append(item);
			});
		} else {
			Object.assign(this.items, items ?? {});
		}

		this.setLength();

		return this;
	}

	merge(mergedList?: List<K, T>) {
		this.concat(mergedList?.items);

		return this;
	}

	intersection(mergedList?: List<K, T>) {
		const inter = intersectionBy(
			this.values(),
			mergedList?.values() ?? [],
			"id"
		) as T[];

		return new List<K, T>(inter);
	}

	difference(mergedList?: List<K, T>) {
		const inter = differenceBy(
			this.values(),
			mergedList?.values() ?? [],
			"id"
		) as T[];

		return new List<K, T>(inter);
	}

	prepend(item: T) {
		if (item.id) {
			let increase = true;
			if (this.items[item.id as K]) {
				delete this.items[item.id as K];
				increase = false;
			}

			this.items = Object.assign(
				{
					[item.id]: item,
				},
				this.items
			);

			if (increase) {
				this.setLength("increase");
			}
		}

		return this;
	}

	append(item: T) {
		if (item.id) {
			let increase = true;
			if (this.items[item.id as K]) {
				delete this.items[item.id as K];
				increase = false;
			}

			this.items[item.id as K] = item;

			if (increase) {
				this.setLength("increase");
			}
		}

		return this;
	}

	delete(item: T) {
		if (item.id && this.items[item.id as K]) {
			delete this.items[item.id as K];

			this.setLength("decrease");
		}

		return this;
	}

	copy(ClassName: typeof List<K, T> = List<K, T>) {
		const newList = new ClassName();

		Object.assign(newList.items, this.items);
		newList.setLength();

		return newList;
	}

	except(item: T, ClassName: typeof List<K, T> = List<K, T>) {
		return this.copy(ClassName).delete(item);
	}

	forEach(iterate: (item: T, key: K, index: number) => void) {
		this.entries().forEach(([key, item], index) => {
			iterate(item as T, key as K, index);
		});
	}

	map<R>(iterate: (item: T, key: K, index: number) => R) {
		return this.entries().map(([key, item], index) => {
			return iterate(item as T, key as K, index);
		});
	}

	reduce<R>(
		iterate: (acc: R, item: T, key: K, index: number) => R,
		initialValue: R
	) {
		return this.entries().reduce((acc, [key, item], index) => {
			return iterate(acc as R, item as T, key as K, index);
		}, initialValue);
	}

	filter(
		filters: Filter | FilterIterator<T, K>,
		ClassName: typeof List<K, T> = List<K, T>
	) {
		const newList = new ClassName();

		const isIterator = typeof filters === "function";
		(this.entries() as Array<[K, T]>).forEach(([itemId, item], index) => {
			if (isIterator) {
				filters(item, itemId, index) && newList.item(itemId, item);

				return;
			}

			if (
				!Object.keys(filters).length ||
				Object.entries(filters).every(([key, value]) => {
					let itemValue: string | undefined;

					if (key === "id") {
						// id is a special prop. it's always a string
						itemValue = item.toProp("id") as unknown as string;
					} else {
						itemValue = item.toProp(key as MultiTag)?.toValue();
					}

					if (Array.isArray(value)) {
						return value.includes(itemValue);
					}

					return itemValue === value;
				})
			) {
				newList.item(itemId, item);
			}
		});

		return newList;
	}

	find(
		filters: Filter | FilterIterator<T, K>,
		_ClassName: typeof List<K, T> = List<K, T>
	) {
		let foundItem: T | undefined;

		const isIterator = typeof filters === "function";
		(this.entries() as Array<[K, T]>).find(([itemId, item], index) => {
			if (isIterator) {
				if (filters(item, itemId, index)) {
					foundItem = item;
					return true;
				}

				return false;
			}

			if (
				!Object.keys(filters).length ||
				Object.entries(filters).every(([key, value]) => {
					let itemValue: string | undefined;

					if (key === "id") {
						// id is a special prop. it's always a string
						itemValue = item.toProp("id") as unknown as string;
					} else {
						itemValue = item.toProp(key as MultiTag)?.toValue();
					}

					if (Array.isArray(value)) {
						return value.includes(itemValue);
					}

					return itemValue === value;
				})
			) {
				foundItem = item;
				return true;
			}

			return false;
		});

		return foundItem;
	}

	orderBy(
		orders: Order | OrderIterator<T, K>,
		ClassName: typeof List<K, T> = List<K, T>
	) {
		const newList = new ClassName();

		const isIterator = typeof orders === "function";

		if (!isIterator && (!orders || !Object.keys(orders).length)) {
			return newList.merge(this);
		}

		const sortedItems = (this.entries() as Array<[K, T]>).toSorted(
			([itemAId, itemA], [itemBId, itemB]) => {
				if (isIterator) {
					return orders(itemA, itemAId, itemB, itemBId);
				}

				const [key, { direction, getter }] = Object.entries(
					typeof orders === "string"
						? { [orders]: { direction: "ASC" } }
						: orders
				)[0] as [MultiTag, OrderDefinition];

				const rawA = itemA.get<T>(key as MultiTag);
				const rawB = itemB.get<T>(key as MultiTag);
				let valueA: unknown | undefined = rawA?.toValue();
				let valueB: unknown | undefined = rawB?.toValue();

				if (getter && typeof getter === "function") {
					valueA = getter(valueA, rawA);
					valueB = getter(valueB, rawB);
				}

				let sortValue = 0;

				if (!valueA && valueA !== 0 && !valueB && valueB !== 0) {
					sortValue = 0;
				} else if (!valueB && valueB !== 0) {
					sortValue = 1;
				} else if (!valueA && valueA !== 0) {
					sortValue = -1;
				} else if (valueA < valueB) {
					sortValue = -1;
				} else if (valueA > valueB) {
					sortValue = 1;
				}

				return sortValue * (direction === "DESC" ? -1 : 1);
			}
		);

		sortedItems.forEach(([key, value]) => {
			newList.item(key, value);
		});

		return newList;
	}

	groupBy(
		groups: Group | GroupIterator<T, K>,
		sort?: "length" | "group" | OrderIterator<List<K, T>, string>,
		minOccurance = -1,
		lessOccuranceLabel = "Appearing less than 5 times",
		ClassName: typeof List<K, T> = List<K, T>
	) {
		const groupped: Record<string, List<K, T>> = {};

		const isIterator = typeof groups === "function";

		if (!isIterator && (!groups || !Object.keys(groups).length)) {
			groupped.Unknown = new ClassName().merge(this);
			groupped.Unknown.marker = "Unknown";
			return groupped;
		}

		this.forEach((item, itemId) => {
			const group: (string | GroupMarker)[] = [];
			if (isIterator) {
				const newGroups = groups(item, itemId);

				group.push(
					...(Array.isArray(newGroups) ? newGroups : [newGroups])
				);
			} else {
				const [key, { getter }] = Object.entries(
					typeof groups === "string" ? { [groups]: {} } : groups
				)[0] as [MultiTag, GroupDefinition];

				const raw = item
					.get<T>(key as MultiTag)
					?.toList()
					.index(0);
				let value = raw?.toValue();

				if (getter && typeof getter === "function") {
					value = getter(value, raw) as typeof value;
				}

				if (value) {
					group.push(value);
				}
			}

			if (!group.length) {
				group.push("Unknown");
			}

			group.forEach((g) => {
				const newGroup: GroupMarker =
					typeof g === "string" ? { group: g } : g;
				if (!groupped[newGroup.group]) {
					groupped[newGroup.group] = new ClassName();
					groupped[newGroup.group].marker =
						newGroup.marker ?? newGroup.group;
				}
				groupped[newGroup.group]?.append(item);
			});
		});

		if (sort) {
			return Object.entries(groupped)
				.toSorted(([ak, a], [bk, b]) => {
					if (typeof sort === "function") {
						return sort(a, ak, b, bk);
					}

					if (ak === "Unknown") {
						return 1;
					}
					if (bk === "Unknown") {
						return -1;
					}

					if (sort === "group") {
						return ak.localeCompare(bk);
					}
					return (b?.length ?? 0) - (a?.length ?? 0);
				})
				.reduce<Record<string, List<K, T>>>((acc, [key, value]) => {
					if (
						minOccurance > -1 &&
						(value?.length ?? 0) < minOccurance
					) {
						const otherKey = lessOccuranceLabel;
						acc[otherKey] =
							acc[otherKey] && value
								? acc[otherKey].merge(value)
								: value;
					} else {
						acc[key] = value;
					}

					return acc;
				}, {});
		}

		return groupped;
	}

	findIndex(item: T) {
		if (!item?.id) {
			return -1;
		}

		return this.keys().findIndex((key) => key === item.id);
	}

	getItems() {
		return this.items;
	}

	toJson(tag: MultiTag, options?: ConvertOptions) {
		const json = this.toObject(tag, options);

		return JSON.stringify(json);
	}

	toObject(tag: MultiTag, options?: ConvertOptions) {
		const json: Record<
			string,
			| string
			| undefined
			| ({ value?: string } & Record<string, unknown>)
			| Array<
					| string
					| undefined
					| ({ value?: string } & Record<string, unknown>)
			  >
		> = {};
		(this.entries() as Array<[K, T]>).forEach(([_, item]) => {
			const validTag = getValidTag(tag);

			if (json[validTag]) {
				if (!Array.isArray(json[validTag])) {
					json[validTag] = [json[validTag]];
				}

				json[validTag].push(
					item.toObject(validTag as MultiTag | undefined, options)
				);
			} else {
				json[validTag] = item.toObject(
					validTag as MultiTag | undefined,
					options
				);
			}
		});

		return json;
	}

	toGedcom(tag: MultiTag, level = 0, options?: ConvertOptions) {
		const gedcom = this.toGedcomLines(tag, level, options);

		return gedcom.join("\n");
	}

	toGedcomLines(tag: MultiTag, level = 0, options?: ConvertOptions) {
		const gedcom: string[] = [];

		(this.entries() as Array<[K, T]>).forEach(([_, item]) => {
			const validTag = getValidTag(tag);
			const validKey = item.id;
			const validValue = validKey ? validTag : item.exportValue();
			gedcom.push(
				`${level} ${validKey || validTag}${
					validValue ? ` ${validValue}` : ""
				}`
			);
			gedcom.push(
				...item.toGedcomLines(
					validTag as MultiTag | undefined,
					level + 1,
					options
				)
			);
		});

		return gedcom;
	}

	toValue() {
		const propList = new List();
		(this.entries() as Array<[K, T]>).forEach(([key, item]) => {
			propList.item(key, item?.toValue() as unknown as T);
		});

		return propList;
	}

	// @deprecated use get instead
	toProp(tag: MultiTag) {
		return this.get(tag);
	}

	toList() {
		return new List().concat(this.items);
	}

	toValueList() {
		const newList = new List();

		(this.values() as Common[]).forEach((value) => {
			value.value && newList.item(value.value as IdType, value);
		});

		return newList;
	}
}
