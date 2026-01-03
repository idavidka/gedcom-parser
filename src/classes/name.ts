import type { IdType } from "../types/types";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { type GedComType } from "./gedcom";
import { Indi } from "./indi";

export class CommonName extends Common<string> {
	NPFX?: Common;
	GIVN?: Common;
	NICK?: Common;
	SPFX?: Common;
	SURN?: Common;
	NSFX?: Common;
	DISPLAY?: Common;
	_MARNM?: Common;

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
		if (value && this._main instanceof Indi) {
			const nameParts = value.match(
				/(?<givenname>[^/]*)(\/(?<surname>[^/]*)\/)?(?<suffix>.*)$/
			)?.groups as null | {
				givenname?: string;
				surname?: string;
				suffix?: string;
			};

			if (nameParts?.givenname?.trim()) {
				this.GIVN =
					this.GIVN ||
					createCommon(this._gedcom, undefined, this.main);
				this.GIVN.isListable = false;
				this.GIVN.value = nameParts.givenname.trim();
			}

			if (nameParts?.surname?.trim()) {
				this.SURN =
					this.SURN ||
					createCommon(this._gedcom, undefined, this.main);
				this.SURN.value = nameParts.surname.trim();
				this.SURN.isListable = false;
			}

			if (nameParts?.suffix?.trim()) {
				this.NSFX =
					this.NSFX ||
					createCommon(this._gedcom, undefined, this.main);
				this.NSFX.value = nameParts.suffix.trim();
				this.NSFX.isListable = false;
			}
		}

		this._value = value;
	}

	get value() {
		if (this._value === undefined && this.DISPLAY?.value) {
			return this.DISPLAY?.value;
		}

		return this._value;
	}

	name(value: string | undefined) {
		this.value = value;

		return this;
	}
}

export const createCommonName = (
	gedcom?: GedComType,
	id?: IdType,
	main?: Common,
	parent?: Common
): ProxyOriginal<CommonName> => {
	return createProxy(
		new CommonName(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<CommonName>;
};
