/**
 * GEDCOM 7 date calendar + PHRASE helpers.
 */

import type { Common } from "../classes/common";
import { createCommon } from "../classes/common";
import type { CommonDate } from "../classes/date";
import type { GedComType } from "../classes/gedcom";

/** Official GEDCOM 7 calendars. */
export const GEDCOM7_CALENDARS = [
	"GREGORIAN",
	"JULIAN",
	"FRENCH_R",
	"HEBREW",
] as const;
export type Gedcom7Calendar = (typeof GEDCOM7_CALENDARS)[number];

const CALENDAR_PREFIX =
	/^(?<calendar>GREGORIAN|JULIAN|FRENCH_R|HEBREW)\b\s+/i;

export const parseGedcom7CalendarPrefix = (value: string) => {
	const match = value.match(CALENDAR_PREFIX);
	if (!match?.groups?.calendar) {
		return { calendar: undefined as Gedcom7Calendar | undefined, rest: value };
	}
	return {
		calendar: match.groups.calendar.toUpperCase() as Gedcom7Calendar,
		rest: value.slice(match[0].length),
	};
};

export const withGedcom7Calendar = (
	value: string,
	calendar?: Gedcom7Calendar | string | null
) => {
	if (!calendar || calendar.toUpperCase() === "GREGORIAN") {
		return value;
	}
	const upper = calendar.toUpperCase();
	if ((GEDCOM7_CALENDARS as readonly string[]).includes(upper)) {
		const { rest } = parseGedcom7CalendarPrefix(value);
		return `${upper} ${rest}`.trim();
	}
	return value;
};

type RestoreFn = () => void;

/**
 * For GEDCOM 7 export: unparseable free-text DATE payloads become empty DATE
 * with a PHRASE child (original text preserved). Returns restore callback.
 */
export const applyGedcom7DatePhrases = (gedcom: GedComType): RestoreFn => {
	const restores: RestoreFn[] = [];

	const visitDate = (dateNode: Common | undefined) => {
		if (!dateNode || typeof dateNode.toValue !== "function") {
			return;
		}

		// CommonDate exposes DAY/MONTH/YEAR when parsed successfully.
		const asDate = dateNode as CommonDate;
		const hasComponents = !!(asDate.DAY || asDate.MONTH || asDate.YEAR);
		const raw = dateNode.exportValue?.() ?? dateNode.toValue();
		if (typeof raw !== "string" || !raw.trim()) {
			return;
		}

		const { calendar, rest } = parseGedcom7CalendarPrefix(raw.trim());
		const looksStructured =
			hasComponents ||
			/^(ABT|CAL|EST|BEF|AFT|FROM|TO|BET|INT)(\s|$)/i.test(rest) ||
			/\bAND\b/i.test(rest) ||
			/^\d{1,2}\s+[A-Z]{3}\s+\d{1,4}/i.test(rest) ||
			/^[A-Z]{3}\s+\d{1,4}/i.test(rest) ||
			/^\d{1,4}$/.test(rest);

		if (looksStructured) {
			if (calendar && calendar !== "GREGORIAN") {
				const previous = dateNode.value;
				const next = withGedcom7Calendar(rest, calendar);
				if (previous !== next) {
					dateNode.value = next;
					restores.push(() => {
						dateNode.value = previous;
					});
				}
			}
			return;
		}

		// Free-text / vernacular date → PHRASE
		const previousValue = dateNode.value;
		const previousPhrase = dateNode.get("PHRASE");
		const previousPhraseValue = previousPhrase?.toValue();
		dateNode.removeValue();
		if (previousPhrase) {
			previousPhrase.value = raw.trim();
		} else {
			const phrase = createCommon(
				dateNode.getGedcom(),
				undefined,
				dateNode.main
			);
			phrase.value = raw.trim();
			dateNode.set("PHRASE", phrase);
		}
		restores.push(() => {
			if (previousValue === undefined) {
				dateNode.removeValue();
			} else {
				dateNode.value = previousValue;
			}
			if (previousPhrase) {
				previousPhrase.value = previousPhraseValue;
			} else {
				dateNode.remove("PHRASE");
			}
		});
	};

	const walk = (node: Common | undefined) => {
		if (!node) return;
		node.get("DATE")?.toList()?.forEach((item) => visitDate(item));
		node.get("SDATE")?.toList()?.forEach((item) => visitDate(item));
	};

	gedcom.indis()?.forEach((indi) => {
		if (!indi) return;
		walk(indi);
		// Common event tags
		(
			[
				"BIRT",
				"DEAT",
				"CHR",
				"BAPM",
				"BURI",
				"CREM",
				"ADOP",
				"EVEN",
				"RESI",
				"OCCU",
				"MARR",
			] as const
		).forEach((tag) => {
			indi.get(tag)?.toList()?.forEach((event) => walk(event));
		});
	});

	gedcom.fams()?.forEach((fam) => {
		if (!fam) return;
		(["MARR", "DIV", "ENGA", "ANUL", "EVEN"] as const).forEach((tag) => {
			fam.get(tag)?.toList()?.forEach((event) => walk(event));
		});
	});

	return () => {
		for (let i = restores.length - 1; i >= 0; i -= 1) {
			restores[i]?.();
		}
	};
};
