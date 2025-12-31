import { type ObjeKey } from "../types";

import { List } from "../classes/list";
import { type ObjeType } from "../classes/obje";

export class Objects extends List<ObjeKey, ObjeType> {
	copy() {
		const newList = new Objects();

		this.entries().forEach(([key, value]) => {
			newList.item(key as ObjeKey, value as ObjeType);
		});

		return newList;
	}

	except(item: ObjeType) {
		return this.copy().delete(item);
	}
}
