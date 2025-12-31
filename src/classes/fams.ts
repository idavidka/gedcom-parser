import {
	type FamKey,
	type Filter,
	type Order,
	type FilterIterator,
	type OrderIterator,
} from "../types";
import { type IFamilies } from "../interfaces/fams";

import { type FamType, Fam } from "../classes/fam";
import { Individuals } from "../classes/indis";
import { List } from "../classes/list";

export class Families extends List<FamKey, FamType> implements IFamilies {
	copy(): Families {
		return super.copy(Families) as Families;
	}

	except(item: FamType): Families {
		return super.except(item, Families) as Families;
	}

	filter(filters: Filter | FilterIterator<FamType, FamKey>): Families {
		return super.filter(filters, Families) as Families;
	}

	find(
		filters: Filter | FilterIterator<FamType, FamKey>
	): FamType | undefined {
		return super.find(filters, Families) as FamType | undefined;
	}

	orderBy(orders: Order | OrderIterator<FamType, FamKey>): Families {
		return super.orderBy(orders, Families) as Families;
	}

	getParents(): Individuals {
		const persons = new Individuals();

		this.values().forEach((fam) => {
			if (fam && fam instanceof Fam) {
				persons.merge(fam.getParents());
			}
		});

		return persons;
	}

	getChildren(): Individuals {
		const persons = new Individuals();

		this.values().forEach((fam) => {
			if (fam && fam instanceof Fam) {
				persons.merge(fam.getChildren());
			}
		});

		return persons;
	}

	toList() {
		return new Families().concat(this.getItems());
	}
}
