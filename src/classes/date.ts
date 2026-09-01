import type { Locale } from "date-fns";
import { format, isValid, parse } from "date-fns";

import { getDateLocale } from "../factories";
import type { ConvertOptions } from "../interfaces/common";
import type { IdType, MultiTag } from "../types/types";
import { ACCEPTED_DATE_FORMATS } from "../utils/date-formatter";
import { inRange } from "../utils/range";
import type { Range } from "../utils/range";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import type { GedComType } from "./gedcom";
import type { List } from "./list";

const LONG_NOTES = {
	"Abt.": "About",
	"Bef.": "Before",
	"Aft.": "After",
};

/**
 * Standard GEDCOM date qualifiers mapped to the dotted note form used
 * internally (and as i18n keys) across the app.
 */
const STANDARD_QUALIFIERS: Record<string, keyof typeof LONG_NOTES> = {
	ABT: "Abt.",
	ABOUT: "Abt.",
	BEF: "Bef.",
	BEFORE: "Bef.",
	AFT: "Aft.",
	AFTER: "Aft.",
};

/** Reverse mapping for standard-compliant GEDCOM export. */
const EXPORT_QUALIFIERS: Record<string, string> = {
	"Abt.": "ABT",
	"Bef.": "BEF",
	"Aft.": "AFT",
};

const GEDCOM_MONTHS =
	/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g;

const NOTE_MARKER = "####";
/**
 * Format a date based on available components (DAY, MONTH, YEAR, NOTE)
 */
const formatDateWithComponents = (
	date: Date,
	hasDay: boolean,
	hasMonth: boolean,
	hasYear: boolean,
	noteValue: string | undefined,
	baseFormat = "dd MMM yyyy",
	locale?: Locale | null
): string => {
	const hasNote = baseFormat.includes("NOTE");
	let validDateFormat = baseFormat.replace("NOTE", NOTE_MARKER);

	if (!hasDay) {
		validDateFormat = validDateFormat.replace(/d+/g, "");
	}

	if (!hasMonth) {
		validDateFormat = validDateFormat.replace(/[.\-\s/]*M+/g, "");
	}

	if (!hasYear) {
		validDateFormat = validDateFormat.replace(/y+[.\-\s/]*/g, "");
	}

	validDateFormat = validDateFormat
		.replace(/([.\-\s/])\1+/g, "$1")
		.replace(/^[.\-\s/]+|[.\-\s/]+$/g, "");

	const formattedDate = format(date, validDateFormat, {
		...(locale !== null
			? { locale: locale ? locale : getDateLocale() }
			: {}),
	});

	// Add NOTE prefix if it exists
	return noteValue && hasNote
		? formattedDate.replace(NOTE_MARKER, noteValue).trim()
		: formattedDate.replace(NOTE_MARKER, "").trim();
};

export class CommonDate extends Common<string> {
	private _date?: Date;

	DAY?: Common;
	MONTH?: Common;
	YEAR?: Common;
	NOTE?: Common;

	constructor(
		gedcom?: GedComType,
		id?: IdType,
		main?: Common,
		parent?: Common
	) {
		super(gedcom, id, main, parent);

		delete this.id;
	}

	set value(value: string | undefined) {
		if (value) {
			const noteRegExp = /^(?<note>[a-zA-Z]+\.)/;
			const noteMatch = value.match(noteRegExp)?.groups;
			let validValue = value;
			if (noteMatch?.note) {
				this.NOTE =
					this.NOTE ||
					createCommon(this._gedcom, undefined, this.main);
				this.NOTE.value = noteMatch?.note;

				validValue = value.replace(noteRegExp, "");
			} else {
				// Standard GEDCOM qualifiers (ABT, BEF, AFT, ...) carry no
				// trailing dot; normalize them to the internal dotted form.
				const qualifierMatch = value.match(
					/^(?<qualifier>ABT|ABOUT|BEF|BEFORE|AFT|AFTER)\b\s*/i
				);
				const qualifier =
					qualifierMatch?.groups?.qualifier?.toUpperCase();
				const note = qualifier
					? STANDARD_QUALIFIERS[qualifier]
					: undefined;
				if (note) {
					this.NOTE =
						this.NOTE ||
						createCommon(this._gedcom, undefined, this.main);
					this.NOTE.value = note;

					validValue = value.slice(qualifierMatch![0].length);
				}
			}

			const acceptedDate = this.isValidDateFormat(validValue);
			if (acceptedDate) {
				this.DAY =
					this.DAY ||
					createCommon(this._gedcom, undefined, this.main);
				this.DAY.value = format(acceptedDate, "dd");

				this.MONTH =
					this.MONTH ||
					createCommon(this._gedcom, undefined, this.main);
				this.MONTH.value = format(acceptedDate, "MMM");

				this.YEAR =
					this.YEAR ||
					createCommon(this._gedcom, undefined, this.main);
				this.YEAR.value = format(acceptedDate, "yyyy");

				this._date = acceptedDate;
				this._value = value;
			} else {
				let fixedValue = validValue;
				if (/\d{4} [A-Za-z]+\s*$/.test(validValue)) {
					fixedValue = `${validValue} 1`;
				} else if (/^\s*[A-Za-z]+ \d{4}/.test(validValue)) {
					fixedValue = `1 ${validValue}`;
				}

				this._date = new Date(fixedValue);
				this._value = value;

				if (this._date && isValid(this._date)) {
					const yearMonthDay =
						/[\dA-Za-z]+ [\dA-Za-z]+ [\dA-Za-z]+/.test(validValue);
					const yearMonth = /[\dA-Za-z]+ [\dA-Za-z]+/.test(
						validValue
					);
					const year = /[\dA-Za-z]+/.test(validValue);
					if (yearMonthDay) {
						this.DAY =
							this.DAY ||
							createCommon(this._gedcom, undefined, this.main);
						this.DAY.value = format(this._date, "dd");
					}

					if (yearMonth || yearMonthDay) {
						this.MONTH =
							this.MONTH ||
							createCommon(this._gedcom, undefined, this.main);
						this.MONTH.value = format(this._date, "MMM");
					}

					if (year || yearMonth || yearMonthDay) {
						this.YEAR =
							this.YEAR ||
							createCommon(this._gedcom, undefined, this.main);
						this.YEAR.value = format(this._date, "yyyy");
					}
				}
			}
		}
	}

	get value() {
		const hasDay = !!this.DAY?.value;
		const hasMonth = !!this.MONTH?.value;
		const hasYear = !!this.YEAR?.value;
		if (
			!this._date ||
			!isValid(this._date) ||
			(!hasDay && !hasMonth && !hasYear)
		) {
			return this._value;
		}

		return formatDateWithComponents(
			this._date,
			hasDay,
			hasMonth,
			hasYear,
			this.NOTE?.value
		);
	}

	get rawValue() {
		return this._date;
	}

	assign<T extends Common | List = Common | List>(
		name: MultiTag,
		value: T,
		unique = false
	) {
		if (!["DAY", "MONTH", "YEAR"].includes(name)) {
			return super.assign(name, value, unique);
		} else {
			this.set(name, value);
		}
		return this.get(name) as T | undefined;
	}

	private isValidDateFormat(value: string) {
		let validDate: Date | undefined;
		ACCEPTED_DATE_FORMATS.find((acceptedFormat) => {
			const date = parse(value, acceptedFormat, new Date());

			if (isValid(date)) {
				validDate = date;
				return true;
			}

			return false;
		});

		return validDate;
	}

	toNote(short = true): string | undefined {
		const note = this.NOTE?.value?.trim() as keyof typeof LONG_NOTES;

		if (!short) {
			return LONG_NOTES[note];
		}

		return note;
	}

	toValue(
		dateFormat = "dd MMM yyyy",
		locale?: Locale | null
	): string | undefined {
		const hasDay = !!this.DAY?.value;
		const hasMonth = !!this.MONTH?.value;
		const hasYear = !!this.YEAR?.value;
		if (
			!this._date ||
			!isValid(this._date) ||
			(!hasDay && !hasMonth && !hasYear)
		) {
			return this._value;
		}

		return formatDateWithComponents(
			this._date,
			hasDay,
			hasMonth,
			hasYear,
			this.NOTE?.value,
			dateFormat,
			locale
		);
	}

	exportValue() {
		const formatted = this.toValue("NOTE dd MMM yyyy", null);
		if (!formatted) {
			return formatted;
		}

		// Emit standard GEDCOM: uppercase month codes and standard date
		// qualifiers (ABT/BEF/AFT) instead of the internal dotted notes.
		const note = this.NOTE?.value?.trim();
		const qualifier = note ? EXPORT_QUALIFIERS[note] : undefined;
		const standardized = qualifier
			? formatted.replace(note!, qualifier)
			: formatted;

		return standardized.replace(GEDCOM_MONTHS, (month) =>
			month.toUpperCase()
		);
	}

	toGedcomLines(tag?: MultiTag, level = 0, options?: ConvertOptions) {
		// DAY/MONTH/YEAR are internal decompositions of the DATE value, not
		// valid GEDCOM sub-structures — never emit them as child lines.
		// The qualifier NOTE (Abt./Bef./Aft.) is already embedded in the
		// DATE value by exportValue(), so skip it here as well.
		const internal = new RegExp(
			`^${level} (DAY|MONTH|YEAR)( |$)|^${level} NOTE (Abt\\.|Bef\\.|Aft\\.)$`
		);
		return super
			.toGedcomLines(tag, level, options)
			.filter((line) => !internal.test(line));
	}

	inRange(range: Range, trueIfNoYear = false) {
		return inRange(this.YEAR?.value, range, trueIfNoYear);
	}
}

export const createCommonDate = (
	gedcom?: GedComType,
	id?: IdType,
	main?: Common,
	parent?: Common
): ProxyOriginal<CommonDate> => {
	return createProxy(
		new CommonDate(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<CommonDate>;
};

export const isCommonDate = (value?: unknown): value is CommonDate => {
	return (
		!!value &&
		value !== null &&
		typeof value === "object" &&
		"_date" in value
	);
};
