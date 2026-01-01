import get from "lodash/get";
import set from "lodash/set";

import { Individuals as IndividualsClass } from "../classes/indis";
import { type NestedGroup } from "../types";

import type { Individuals } from "../classes/indis";

// Use a WeakMap to track unique items for each node without polluting the object
const uniqueItemsCache = new WeakMap<NestedGroup, Individuals>();

export const setNestedGroup = (
	obj: NestedGroup,
	key: string | string[],
	value: Individuals,
	uniqueCounting = true
) => {
	const parts = Array.isArray(key) ? key : key.split(/,\s*/);

	// Set items only at the leaf level (deepest level of this path)
	set(obj, [...parts, "items"], value);

	// Update lengths at all parent levels by tracking unique items incrementally
	parts.forEach((_, index) => {
		if (!uniqueCounting) {
			// If not unique counting, simply set the length to the number of items at this level
			const key = [...parts.toSpliced(index + 1), "length"];
			const length = get(obj, key);
			set(obj, key, (length ?? 0) + value.length);
			return;
		}

		const pathKey = [...parts.toSpliced(index + 1)];
		const node = get(obj, pathKey) as NestedGroup | undefined;

		if (node) {
			// Get or create the unique items collection for this node
			let uniqueItems = uniqueItemsCache.get(node);
			if (!uniqueItems) {
				uniqueItems = new IndividualsClass();
				uniqueItemsCache.set(node, uniqueItems);
			}

			// Merge the new items to track unique individuals
			uniqueItems.merge(value);

			// Update the length to be the count of unique items
			set(obj, [...pathKey, "length"], uniqueItems.length);
		}
	});
};
