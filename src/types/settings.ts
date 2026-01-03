import type {
	CurrentNameOfTown,
	LinkedPersons,
	MultiTag,
	NameOrder,
	PlaceOrder,
} from "./types";

export interface Settings {
	// basic
	maxGivennames: number;
	maxSurnames: number;
	showSuffix: boolean;
	dateFormatPattern: string;
	nameOrder: NameOrder;
	placeOrder: PlaceOrder;
	currentNameOfTown: CurrentNameOfTown;
	linkedPersons?: LinkedPersons;
	linkingKey?: MultiTag;
}
