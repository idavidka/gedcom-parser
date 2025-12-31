import { format, isValid, parse } from "date-fns";

import { getDateFnsLocale } from "../constants";
import type { IdType, MultiTag } from "../types";
import { ACCEPTED_DATE_FORMATS } from "../utils";
import { inRange } from "../utils";
import type { Range } from "../utils";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { type GedComType } from "./gedcom";
import type { List } from "./list";

const LONG_NOTES = {
	"Abt.": "About",
	"Bef.": "Before",
	"Aft.": "After",
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
		if (!this._date || !isValid(this._date)) {
			return this._value;
		}

		return format(this._date, "dd MMM yyyy");
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

	toValue(dateFormat = "dd MMM yyyy"): string | undefined {
		if (!this._date || !isValid(this._date)) {
			return this._value;
		}

		let validDateFormat = dateFormat;
		if (!this.DAY?.value) {
			validDateFormat = validDateFormat.replace(/d+/g, "");
		}

		if (!this.MONTH?.value) {
			validDateFormat = validDateFormat.replace(/[.\-\s/]*M+/g, "");
		}

		if (!this.YEAR?.value) {
			validDateFormat = validDateFormat.replace(/y+[.\-\s/]*/g, "");
		}
		validDateFormat = validDateFormat
			.replace(/([.\-\s/])\1+/g, "$1")
			.replace(/^[.\-\s/]+|[.\-\s/]+$/g, "");

		return format(this._date, validDateFormat, {
			locale: getDateFnsLocale(),
		});
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
