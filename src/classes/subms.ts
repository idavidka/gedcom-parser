import { type SubmKey } from "../../../types/types";

import { List } from "./list";
import { type SubmType } from "./subm";

export class Submitters extends List<SubmKey, SubmType> {
	copy() {
		const newList = new Submitters();

		this.entries().forEach(([key, value]) => {
			newList.item(key as SubmKey, value as SubmType);
		});

		return newList;
	}

	except(item: SubmType) {
		return this.copy().delete(item);
	}
}
