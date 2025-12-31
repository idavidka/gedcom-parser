import { type RepoKey } from "../types";

import { List } from "../classes/list";
import { type RepoType } from "../classes/repo";

export class Repositories extends List<RepoKey, RepoType> {
	copy() {
		const newList = new Repositories();

		this.entries().forEach(([key, value]) => {
			newList.item(key as RepoKey, value as RepoType);
		});

		return newList;
	}

	except(item: RepoType) {
		return this.copy().delete(item);
	}
}
