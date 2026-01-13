import get from "lodash-es/get";
import set from "lodash-es/set";
import uniqBy from "lodash-es/uniqBy";
import unset from "lodash-es/unset";

import { ID_GETTER_REG, ID_REG } from "../constants/constants";
import {
	type Tag,
	type IdType,
	type MultiTag,
	type ObjeKey,
} from "../types/types";
import type { ListTag } from "../types/types";
import { type ConvertOptions } from "../interfaces/common";
import type ICommon from "../interfaces/common";
import type IObje from "../interfaces/obje";

import { type GedComType } from "./gedcom";
import { List } from "./list";

// import GedcomTree from "../../../utils/parser";

export class Common<T = string, I extends IdType = IdType> implements ICommon<
	T,
	I
> {
	protected _gedcom?: GedComType;
	protected _value?: T;
	protected _id?: I;
	protected _main?: Common;
	protected _parent?: Common;
	protected _uniqueId?: string | undefined;
	protected _type?: MultiTag;
	protected _refs?: List;

	isListable = true;
	refType?: ListTag;
	cloneOf?: string;
	clonedBy?: string;

	constructor(gedcom?: GedComType, id?: I, main?: Common, parent?: Common) {
		this._gedcom = gedcom;
		this._main = main;
		this._parent = parent;

		this.initUniqueId();

		if (id) {
			this._id = id;
		} else {
			delete this._id;
		}
	}

	set type(type: MultiTag | undefined) {
		if (type) {
			this.uniqueId = this.uniqueId?.replace(/^[^:]+/, `~${type}`);
		}
		this._type = type;
	}

	get type(): MultiTag | undefined {
		return this._type;
	}

	initUniqueId() {
		if (this._gedcom) {
			this.uniqueId = `~Common:${this._gedcom.refcount++}`;
		}
	}

	set uniqueId(id: string | undefined) {
		const currentId = this._uniqueId;
		if (this._gedcom?.reflist && id) {
			this._uniqueId = id;
			if (currentId && this._gedcom.reflist[currentId]) {
				delete this._gedcom.reflist[currentId];
			}
			this._gedcom.reflist[id] = this as Common;
		}
	}

	get uniqueId(): string | undefined {
		return this._uniqueId;
	}

	set id(id: I | undefined) {
		this._id = idGetter(id);
	}

	get id() {
		return idGetter(this._id);
	}

	set value(value: T | undefined) {
		this._value = value;
	}

	get value() {
		return this._value;
	}

	// avoid to override
	get originalValue() {
		return this._value;
	}

	get ref(): Common<T, I> | undefined {
		if (
			typeof this.value === "string" &&
			isId(this.value) &&
			this.refType
		) {
			return this._gedcom?.[getListTag(this.refType!)]?.item(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				this.value as any
			) as Common<T, I> | undefined;
		}

		return this as Common<T, I>;
	}

	get main() {
		return this._main;
	}

	get parent() {
		return this._parent;
	}

	addRef(refNode: Common) {
		if (
			typeof refNode.value === "string" &&
			isId(refNode.value) &&
			refNode.refType
		) {
			if (!this._refs) {
				this._refs = new List();
			}

			this._refs.item(refNode.value, refNode);
		}
	}

	getRefs() {
		return this._refs;
	}

	exportValue() {
		return this.value;
	}

	removeValue() {
		delete this._value;
	}

	set<T extends Common | List = Common | List>(
		name: MultiTag,
		value: T | string
	) {
		if (typeof value === "string") {
			const usedValue = createCommon(this._gedcom, undefined, this.main);
			usedValue.value = value as string;

			set(this, name, usedValue);
		} else {
			set(this, name, value);
		}
		return get(this, name) as T | undefined;
	}

	assign<T extends Common | List = Common | List>(
		name: MultiTag,
		value: T,
		unique = false
	) {
		let curValue = this.get<List>(name);
		if (curValue?.isListable) {
			if (curValue instanceof Common) {
				curValue = new List().concat({ ...[curValue] });

				this.set(name, curValue);
			}

			const values = [
				...curValue.values(),
				...(value instanceof List ? value.values() : [value]),
			];

			curValue.concat({
				...(!unique
					? values
					: uniqBy(values, (value) =>
							value instanceof Common ? value?.value : undefined
						)),
			});
		} else {
			this.set(name, value);
		}
		return get(this, name) as T | undefined;
	}

	get<T extends Common | List = Common | List>(name: MultiTag) {
		if (!name.includes(".")) {
			return get(this, name) as T | undefined;
		}

		const nameParts = name.split(".") as Tag[];
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		let last: T | List | undefined = this as unknown as T;

		for (const part of nameParts) {
			const indexPart = Number(part);
			const itemIndex = part.match(/items\[(?<itemIndex>\d+)\]/)?.groups
				?.itemIndex;
			const itemId = part.match(/items\[(?<itemId>@[A-Z]+\d+@)\]/)?.groups
				?.itemId;
			const usedPart = itemId || itemIndex;
			if (last instanceof List) {
				if (!isNaN(indexPart)) {
					last = last.index(indexPart) as T | List | undefined;
				} else {
					if (usedPart) {
						last = last.item(usedPart as IdType) as
							| T
							| List
							| undefined;
					} else {
						last = last?.index(0)?.get(part) as
							| T
							| List
							| undefined;
					}
				}
			} else {
				const usedIndex = Number(itemIndex ?? indexPart);
				if (!isNaN(usedIndex)) {
					last = last?.toList().index(usedIndex) as
						| T
						| List
						| undefined;
				} else {
					last = last?.get((itemId ?? part) as MultiTag) as
						| T
						| List
						| undefined;
				}
			}

			if (!last) {
				break;
			}
		}

		return last as T;
	}

	remove(name: MultiTag) {
		unset(this, name);
	}

	getGedcom() {
		return this._gedcom;
	}

	getIf<T extends Common | List = Common | List>(
		name: MultiTag,
		condition: string,
		name2: MultiTag
	) {
		const nameParts = name.split(".");
		const name2Parts = name2.split(".");

		if (nameParts.length !== name2Parts.length) {
			throw new Error("Tag pathes must be of the same depth");
		}

		if (nameParts.length > 1 && nameParts[0] !== name2Parts[0]) {
			throw new Error("Final tags must be siblings");
		}

		const valueCommon = this.get<T>(name);

		if (valueCommon instanceof Common) {
			return valueCommon?.toValue() !== condition
				? undefined
				: this.get<T>(name2);
		}

		const valueCommon2 = this.get<T>(name2)?.toList();
		const ifList = new List();

		valueCommon?.forEach((item, key) => {
			const pair = valueCommon2?.item(key);

			ifList.item(key, item?.toValue() !== condition ? undefined : pair);
		});

		return ifList as T;
	}

	toString() {
		return this.value?.toString() || "";
	}

	toValue() {
		return this.value;
	}

	toProp(tag: MultiTag) {
		const prop = this.get(tag);

		return prop as Common<T, I> | undefined;
	}

	toList() {
		return new List().concat(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.id ? { [this.id]: this } : ({ ...[this] } as any)
		);
	}

	toValueList() {
		return new List().concat(
			this.value
				? { [this.value as IdType]: this }
				: // eslint-disable-next-line @typescript-eslint/no-explicit-any
					({ ...[this] } as any)
		);
	}

	private standardizeObject(tag?: MultiTag, options?: ConvertOptions) {
		if (
			tag === "OBJE" &&
			!options?.original &&
			options?.obje?.standardize &&
			options?.obje?.namespace &&
			"standardizeMedia" in this
		) {
			const standardize = this.standardizeMedia as (
				n: string | number,
				o?: boolean
			) => Common<string, ObjeKey> & IObje;
			return standardize.call(
				this,
				options.obje.namespace,
				options.obje.override
			);
		}
	}

	toJson(tag?: MultiTag, options?: ConvertOptions) {
		const json = this.toObject(tag, options);

		return JSON.stringify(json);
	}

	toObject(tag?: MultiTag, options?: ConvertOptions) {
		this.standardizeObject(tag, options);
		const validKeys = getValidKeys(this);
		let json: Record<
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

		validKeys.forEach((key) => {
			if (key === "id" && this.id !== undefined) {
				json.id = this.id as string;
			} else if (key === "_id" && this._id !== undefined) {
				json.id = this._id as string;
			} else if (key === "value" && this.value !== undefined) {
				json.value = this.value as string;
			} else if (key === "_value" && this._value !== undefined) {
				json.value = this._value as string;
			} else {
				const validKey = key as MultiTag;
				const prop = this.get(validKey);
				if (typeof prop?.toObject === "function") {
					if (prop instanceof Common) {
						json[validKey] = prop.toObject(validKey, options);
					} else {
						json = {
							...json,
							...prop.toObject(validKey, options),
						};
					}
				}
			}
		});

		return json;
	}

	merge(other: Common<T, I>, override = false, avoidKeys: MultiTag[] = []) {
		if (!other) {
			return this;
		}

		const validKeys = getValidKeys(other);

		validKeys.forEach((validKey) => {
			if (avoidKeys.includes(validKey as MultiTag)) {
				return;
			}

			const current = this.get(validKey as MultiTag);
			const mergeValue = other.get(validKey as MultiTag);
			if (mergeValue) {
				if (current instanceof Common || current instanceof List) {
					this.assign(validKey as MultiTag, mergeValue, true);
				} else if (
					!current ||
					(override && validKey !== "id" && validKey !== "_id")
				) {
					this.set(validKey as MultiTag, mergeValue);
				}
			}
		});

		return this;
	}

	clone(newId = false, avoidKeys: MultiTag[] = []) {
		const ctor = this.constructor as {
			new (
				gedcom?: GedComType,
				id?: I,
				main?: Common,
				parent?: Common
			): Common<T, I>;
		};
		const instance = new ctor(
			this._gedcom,
			this._id,
			this._main,
			this._parent
		);

		if (newId && this._id) {
			instance.id = `IFT${this._id.replace(/[^0-9]/g, "")}` as I;
		}

		const cloned = createProxy(instance);
		cloned.merge(this, true, avoidKeys);

		return cloned;
	}

	// fromGedcom<T = typeof this>(value: string) {
	fromGedcom(_value: string) {
		// Object.assign(this, GedcomTree.parse(value) as T);
	}

	toGedcom(tag?: MultiTag, level = 0, options?: ConvertOptions) {
		const gedcom = this.toGedcomLines(tag, level, options);

		return gedcom.join("\n");
	}

	toGedcomLines(tag?: MultiTag, level = 0, options?: ConvertOptions) {
		this.standardizeObject(tag, options);
		const validKeys = getValidKeys(this);
		const gedcom: string[] = [];

		validKeys.forEach((key) => {
			const validKey = key as MultiTag;
			const prop = this.get(validKey);
			if (typeof prop?.toGedcomLines === "function") {
				if (prop instanceof Common) {
					let value = prop.exportValue() as string | undefined;
					
					// For GEDCOM 7, decode URL-encoded sequences
					if (options?.version === 7 && value) {
						value = this.decodeGedcom7Value(value);
					}
					
					gedcom.push(
						`${level} ${validKey}${value ? ` ${value}` : ""}`
					);
					gedcom.push(
						...prop.toGedcomLines(validKey, level + 1, options)
					);
				} else {
					gedcom.push(
						...prop.toGedcomLines(validKey, level, options)
					);
				}
			}
		});

		return gedcom;
	}
	
	/**
	 * Decode GEDCOM escape sequences for GEDCOM 7
	 * GEDCOM 5.5.1 uses escape sequences like %0A for newlines
	 * GEDCOM 7 uses literal characters instead
	 * 
	 * Note: Per GEDCOM 5.5.1 spec, only these escape sequences are used:
	 * - %0A (newline), %0D (carriage return), %09 (tab), %25 (percent)
	 * Other sequences like %20 (space) or %2F (slash) are not part of the standard
	 * 
	 * Safety: Processing %25 first prevents double-decoding. For example:
	 * - Input: "%250A" → After %25: "%0A" → After %0A: "%0A" (unchanged, correct)
	 * - Input: "%0A"   → After %25: "%0A" → After %0A: "\n" (newline, correct)
	 */
	private decodeGedcom7Value(value: string): string {
		// Replace GEDCOM 5.5.1 escape sequences in the correct order
		// %25 must be processed first to avoid double-decoding
		return value
			.replace(/%25/g, '%')   // Percent sign (must be first)
			.replace(/%0A/g, '\n')  // Newline
			.replace(/%0D/g, '\r')  // Carriage return
			.replace(/%09/g, '\t'); // Tab
	}

	isGenoPro() {
		const head = get(this, "HEAD") || get(this.getGedcom(), "HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.toLowerCase()?.startsWith("genopro");
	}

	isAhnenblatt() {
		const head = get(this, "HEAD") || get(this.getGedcom(), "HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.toLowerCase()?.startsWith("ahnenblatt");
	}

	isGeni() {
		const head = get(this, "HEAD") || get(this.getGedcom(), "HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.toLowerCase()?.startsWith("geni");
	}

	isAncestry() {
		const head = get(this, "HEAD") || get(this.getGedcom(), "HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.toLowerCase()?.startsWith("ancestry");
	}

	isMyHeritage() {
		const head = get(this, "HEAD") || get(this.getGedcom(), "HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.toLowerCase()?.startsWith("myheritage");
	}

	isFamilySearch() {
		const head = get(this, "HEAD") || get(this.getGedcom(), "HEAD");
		const sourName = get(head, "SOUR.NAME.value") as string | undefined;

		return sourName === "FamilySearch API";
	}

	getAncestryTreeId() {
		const path = "HEAD.SOUR._TREE.RIN.value";
		return (get(this, path) || get(this.getGedcom(), path)) as
			| string
			| undefined;
	}

	getMyHeritageTreeId() {
		const path = "HEAD._EXPORTED_FROM_SITE_ID.value";
		return (get(this, path) || get(this.getGedcom(), path)) as
			| string
			| undefined;
	}

	getTreeId() {
		if (this?.isAncestry()) {
			return this.getAncestryTreeId();
		}

		if (this?.isMyHeritage()) {
			return this.getMyHeritageTreeId();
		}
	}

	getAncestryTreeName() {
		const path = "HEAD.SOUR._TREE.value";
		return (get(this, path) || get(this.getGedcom(), path)) as
			| string
			| undefined;
	}

	getMyHeritageTreeName() {
		const path = "HEAD.FILE.value";

		const treeDetails = (get(this, path) || get(this.getGedcom(), path)) as
			| string
			| undefined;

		return treeDetails?.match(
			/Exported by MyHeritage.com from (?<tree>.+) in.+$/
		)?.groups?.tree;
	}

	getTreeName() {
		if (this?.isAncestry()) {
			return this.getAncestryTreeName();
		}

		if (this?.isMyHeritage()) {
			return this.getMyHeritageTreeName();
		}
	}
}

export type ProxyOriginal<T extends Common> = T & { unwrapped: T };
export const createProxy = <T extends Common>(target: T): T => {
	return new Proxy<T>(target, {
		get(t, prop: string | symbol, receiver) {
			if (prop === "unwrapped") {
				return target;
			}

			if (prop in t) {
				return Reflect.get(t, prop, receiver);
			}
			if (!isOnlyMainProp(prop)) {
				const ref = t.ref as T;
				if (ref && prop in ref) {
					return Reflect.get(ref, prop, receiver);
				}
			}
		},
	});
};

export const createCommon = (
	gedcom?: GedComType,
	id?: IdType,
	main?: Common,
	parent?: Common
): ProxyOriginal<Common> => {
	return createProxy(
		new Common(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<Common>;
};

export const isOnlyMainProp = (
	key: string | symbol
): key is MultiTag | "_value" | "value" => {
	return (
		key === "_gedcom" ||
		key === "_main" ||
		key === "_parent" ||
		key === "_uniqueId" ||
		key === "_type" ||
		key === "_refs" ||
		key === "id" ||
		key === "_id"
	);
};

export const isValidKey = <T>(
	common: Common<T>,
	key: string | symbol
): key is MultiTag | "_value" | "value" | "id" | "_id" => {
	const prop = get(common, key);
	return (
		key !== "_gedcom" &&
		key !== "_main" &&
		key !== "_parent" &&
		key !== "_uniqueId" &&
		key !== "_refs" &&
		key !== "_type" &&
		(key === "id" ||
			key === "_id" ||
			key === "value" ||
			key === "_value" ||
			prop instanceof Common ||
			prop instanceof List)
	);
};

export const getValidKeys = <T>(common: Common<T>) => {
	return Object.keys(common).filter((key) => {
		return isValidKey(common, key);
	}) as Array<MultiTag | "_value" | "value" | "id" | "_id">;
};

export const getValidTag = (tag: string) => {
	return tag.replace(/^@@/, "");
};

export const getListTag = (tag: string) => {
	return `@@${tag}` as ListTag;
};

export const getValidKey = (tag: string, id: string) => {
	return `${id} ${getValidTag(tag)}`;
};

export const isId = (string: string): string is IdType => {
	return ID_REG.test(string);
};

export const idGetter = <T extends IdType>(id?: T) => {
	if (id === undefined) {
		return undefined;
	}
	let newId = `${id}` as T;

	const parts = newId?.match(ID_GETTER_REG)?.groups as {
		at?: string;
		letter?: string;
	} | null;
	if (!parts?.at && !parts?.letter) {
		newId = `@U${newId}` as T;
	} else if (!parts.at) {
		newId = `@${newId}` as T;
	} else if (!parts.letter) {
		newId = newId.replace(/^@/, "@U") as T;
	}
	if (!newId.endsWith("@")) {
		newId = `${newId}@` as T;
	}
	return newId;
};
