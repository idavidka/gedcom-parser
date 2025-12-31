import { type SourKey } from "../types";

import { List } from "./list";
import { type SourType } from "./sour";

export class Sources extends List<SourKey, SourType> {
	copy() {
		const newList = new Sources();

		this.entries().forEach(([key, value]) => {
			newList.item(key as SourKey, value as SourType);
		});

		return newList;
	}

	except(item: SourType) {
		return this.copy().delete(item);
	}
}
