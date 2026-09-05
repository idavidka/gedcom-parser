import { createCommon } from "../classes/common";
import type { Common } from "../classes/common";
import { createCommonDate } from "../classes/date";
import type { FamType } from "../classes/fam";
import type { GedComType } from "../classes/gedcom";
import type { IndiType } from "../classes/indi";
import { List } from "../classes/list";
import type { MultiTag } from "../types/types";

export type AddFactInput = {
	tag: MultiTag;
	type?: string;
	date?: string;
	place?: string;
	note?: string;
	value?: string;
};

export type AddNonEventInput = {
	/** Event type that did not happen (e.g. MARR, BIRT). */
	event: string;
	/** Optional GEDCOM 7 DatePeriod (e.g. `TO 24 MAR 1880`). */
	date?: string;
	note?: string;
};

const SINGLETON_TAGS = new Set<string>(["BIRT", "DEAT", "SSN", "SEX", "DSCR"]);

const firstRecord = (node?: Common | List): Common | undefined => {
	if (!node) {
		return undefined;
	}

	if (node instanceof List) {
		return node.index(0) as Common | undefined;
	}

	return (node.index(0) as Common | undefined) ?? node;
};

const setDateOn = (
	gedcom: GedComType,
	owner: Common,
	parent: Common,
	date: string
) => {
	const trimmed = date.trim();
	if (!trimmed) {
		return;
	}

	let dateNode = parent.get("DATE");
	if (!dateNode || dateNode instanceof List) {
		dateNode = createCommonDate(gedcom, undefined, owner, parent);
		dateNode.type = "DATE";
		parent.set("DATE", dateNode);
	}
	dateNode.value = trimmed;
};

const fillFact = (
	gedcom: GedComType,
	owner: Common,
	event: Common,
	input: AddFactInput
) => {
	if (input.value?.trim()) {
		event.value = input.value.trim();
	}
	if (input.type?.trim()) {
		event.set("TYPE", input.type.trim());
	}
	if (input.date) {
		setDateOn(gedcom, owner, event, input.date);
	}
	if (input.place?.trim()) {
		event.set("PLAC", input.place.trim());
	}
	if (input.note?.trim()) {
		event.set("NOTE", input.note.trim());
	}
};

export const updateFactRecord = (
	owner: IndiType | FamType,
	event: Common,
	input: AddFactInput
) => {
	const gedcom = owner.getGedcom();
	if (!gedcom) {
		return event;
	}

	const asOwner = owner as unknown as Common;

	if (input.value !== undefined) {
		const trimmed = input.value.trim();
		if (trimmed) {
			event.value = trimmed;
		} else {
			event.removeValue();
		}
	}
	if (input.type !== undefined) {
		const trimmed = input.type.trim();
		if (trimmed) {
			event.set("TYPE", trimmed);
		} else {
			event.remove("TYPE");
		}
	}
	if (input.date !== undefined) {
		const trimmed = input.date.trim();
		if (trimmed) {
			setDateOn(gedcom, asOwner, event, trimmed);
		} else {
			event.remove("DATE");
		}
	}
	if (input.place !== undefined) {
		const trimmed = input.place.trim();
		if (trimmed) {
			event.set("PLAC", trimmed);
		} else {
			event.remove("PLAC");
		}
	}
	if (input.note !== undefined) {
		const trimmed = input.note.trim();
		if (trimmed) {
			event.set("NOTE", trimmed);
		} else {
			event.remove("NOTE");
		}
	}

	return event;
};

export const setFamilyMarriage = (
	fam: FamType,
	input: { date?: string; place?: string }
) => {
	const existing = firstRecord(fam.get("MARR"));
	if (existing) {
		return updateFactRecord(fam, existing, {
			tag: "MARR",
			date: input.date,
			place: input.place,
		});
	}
	return addFamilyFact(fam, {
		tag: "MARR",
		date: input.date,
		place: input.place,
	});
};

export const addIndividualFact = (indi: IndiType, input: AddFactInput) => {
	const gedcom = indi.getGedcom();
	if (!gedcom) {
		return undefined;
	}

	const tag = input.tag;
	let event = SINGLETON_TAGS.has(tag)
		? firstRecord(indi.get(tag))
		: undefined;

	if (!event) {
		event = createCommon(gedcom, undefined, indi);
		event.type = tag;
		if (SINGLETON_TAGS.has(tag)) {
			indi.set(tag, event);
		} else {
			indi.assign(tag, event);
		}
	}

	fillFact(gedcom, indi, event, input);
	return event;
};

export const addFamilyFact = (fam: FamType, input: AddFactInput) => {
	const gedcom = fam.getGedcom();
	if (!gedcom) {
		return undefined;
	}

	const event = createCommon(gedcom, undefined, fam);
	event.type = input.tag;
	fam.assign(input.tag, event);
	fillFact(gedcom, fam, event, input);
	return event;
};

export const setCauseOfDeath = (indi: IndiType, text: string) => {
	const trimmed = text.trim();
	if (!trimmed) {
		return undefined;
	}

	const death =
		firstRecord(indi.get("DEAT")) ||
		addIndividualFact(indi, { tag: "DEAT", value: "Y" });
	if (!death) {
		return undefined;
	}

	death.set("CAUS", trimmed);
	return death;
};

export const setDeceased = (indi: IndiType, deceased: boolean) => {
	if (!deceased) {
		indi.remove("DEAT");
		return;
	}

	if (firstRecord(indi.get("DEAT"))) {
		return;
	}

	addIndividualFact(indi, { tag: "DEAT", value: "Y" });
};

/**
 * GEDCOM 7 non-event: asserts that an event type did not happen
 * (optionally within a DatePeriod).
 */
export const addNonEvent = (
	owner: IndiType | FamType,
	input: AddNonEventInput
) => {
	const gedcom = owner.getGedcom();
	const eventType = input.event?.trim().toUpperCase();
	if (!gedcom || !eventType) {
		return undefined;
	}

	const no = createCommon(gedcom, undefined, owner as unknown as Common);
	no.type = "NO";
	no.value = eventType;

	if (input.date?.trim()) {
		setDateOn(gedcom, owner as unknown as Common, no, input.date);
	}
	if (input.note?.trim()) {
		no.set("NOTE", input.note.trim());
	}

	(owner as unknown as Common).assign("NO", no);
	return no;
};
