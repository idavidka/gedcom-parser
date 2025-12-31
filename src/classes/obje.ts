import type IMultimediaLinkStructure from "../interfaces/multimedia-link";
import { type ObjeKey } from "../types";
import type IObje from "../interfaces/obje";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { type GedComType } from "./gedcom";

export class Obje extends Common<string, ObjeKey> implements IObje {
	standardizeMedia(
		namespace?: string | number,
		override = true,
		urlGetter?: (
			namespace?: string | number,
			imgId?: string
		) => string | undefined
	) {
		if (!this._gedcom) {
			return this;
		}

		const rin = this?.get("RIN")?.toValue() as string | undefined;
		const clone = this?.get("_CLON._OID")?.toValue() as string | undefined;
		const mser = this?.get("_MSER._LKID")?.toValue() as string | undefined;
		const title =
			this?.get("FILE.TITL")?.toValue() ??
			this?.get("TITL")?.toValue() ??
			"";
		const note =
			this?.get("FILE.NOTE")?.toValue() ??
			this?.get("NOTE")?.toValue() ??
			"";
		const form = this?.get("FILE.FORM")?.toValue() as string | undefined;
		const file = this?.get("FILE")?.toValue() as string | undefined;

		const imgId = rin || clone || mser;

		const url = file || (namespace && urlGetter?.(namespace, imgId));

		if (!url) {
			return this;
		}

		const newObject = createObje(this._gedcom, this.id, this.main);

		if (!override) {
			Object.assign(newObject, this);
		}

		if (form) {
			if (typeof form === "string") {
				const newForm = createCommon(
					this._gedcom,
					undefined,
					this.main
				);
				newForm.value = form;
				newObject.set("FORM", newForm);
			} else {
				newObject.set("FORM", form);
			}
		}

		if (title) {
			if (typeof title === "string") {
				const newTitle = createCommon(
					this._gedcom,
					undefined,
					this.main
				);
				newTitle.value = title;
				newObject.set("TITL", newTitle);

				if (!note) {
					newObject.set("NOTE", newTitle);
				}
			} else {
				newObject.set("TITL", title);
				if (!note) {
					newObject.set("NOTE", title);
				}
			}
		}

		if (note) {
			if (typeof note === "string") {
				const newNote = createCommon(
					this._gedcom,
					undefined,
					this.main
				);
				newNote.value = note;
				newObject.set("NOTE", newNote);

				if (!title) {
					newObject.set("TITL", newNote);
				}
			} else {
				newObject.set("NOTE", note);
				if (!title) {
					newObject.set("TITL", note);
				}
			}
		}

		const newUrl = createCommon(this._gedcom, undefined, this.main);
		newUrl.value = url;
		newObject.set("FILE", newUrl);

		if (override) {
			Object.assign(this, newObject);

			return this;
		}

		return newObject;
	}
}

export type ObjeType = Obje & IMultimediaLinkStructure;
export const createObje = (
	gedcom: GedComType,
	id?: ObjeKey,
	main?: Common,
	parent?: Common
): ProxyOriginal<ObjeType> => {
	return createProxy(
		new Obje(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<ObjeType>;
};
