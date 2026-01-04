import type { LinkedPersons, MultiTag, NameOrder, PlaceOrder } from "./types";

export interface Settings {
	// basic
	maxGivennames: number;
	maxSurnames: number;
	showSuffix: boolean;
	dateFormatPattern: string;
	nameOrder: NameOrder;
	placeOrder: PlaceOrder;
	linkedPersons?: LinkedPersons;
	linkingKey?: MultiTag;
}
