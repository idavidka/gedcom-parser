import type IObje from "../interfaces/obje";
import type IMultimediaLinkStructure from "../structures/multimedia-link";
import type { ObjeKey } from "../types/types";
import {
	normalizeGedcomVersion,
	type GedcomExportVersion,
} from "../utils/gedcom-version";
import { inferMediaForm } from "../utils/multimedia";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import type { GedComType } from "./gedcom";

export class Obje extends Common<string, ObjeKey> implements IObje {
	standardizeMedia(
		namespace?: string | number,
		override = true,
		urlGetter?: (
			namespace?: string | number,
			imgId?: string
		) => string | undefined,
		gedcomVersion?: GedcomExportVersion | string
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
		const formRaw =
			(this?.get("FILE.FORM")?.toValue() as string | undefined) ??
			(this?.get("FORM")?.toValue() as string | undefined);
		const mediType =
			(this?.get("FILE.FORM.TYPE")?.toValue() as string | undefined) ??
			(this?.get("FORM.TYPE")?.toValue() as string | undefined) ??
			(this?.get("MEDI")?.toValue() as string | undefined);
		const file = this?.get("FILE")?.toValue() as string | undefined;

		const imgId = rin || clone || mser;

		const url = file || (namespace && urlGetter?.(namespace, imgId));

		if (!url) {
			return this;
		}

		const version = normalizeGedcomVersion(
			gedcomVersion ?? this._gedcom.getGedcomVersion?.()
		);
		const form = formRaw || inferMediaForm(String(url));

		const newObject = createObje(this._gedcom, this.id, this.main);

		if (!override) {
			Object.assign(newObject, this);
		}

		const fileNode = createCommon(this._gedcom, undefined, this.main);
		fileNode.value = url;

		if (version === "7.0") {
			const formNode = createCommon(this._gedcom, undefined, fileNode);
			formNode.value = form;
			if (mediType) {
				formNode.set("TYPE", String(mediType));
			}
			fileNode.set("FORM", formNode);
			if (title) {
				fileNode.set("TITL", String(title));
			}
			if (note) {
				fileNode.set("NOTE", String(note));
			}
			newObject.set("FILE", fileNode);
		} else {
			newObject.set("FILE", fileNode);
			newObject.set("FORM", form);
			if (mediType) {
				newObject.set("MEDI", String(mediType));
			}
			if (title) {
				newObject.set("TITL", String(title));
				if (!note) {
					newObject.set("NOTE", String(title));
				}
			}
			if (note) {
				newObject.set("NOTE", String(note));
				if (!title) {
					newObject.set("TITL", String(note));
				}
			}
		}

		const prim = this.get("_PRIM")?.toValue();
		if (prim === "Y" || prim === "N") {
			newObject.set("_PRIM", prim);
		}

		// Keep vendor media identity so re-import / Ancestry-MyHeritage
		// resolution still works after GEDZIP / G7 reshape.
		const photoRin = this.get("_PHOTO_RIN")?.toValue();
		if (rin) {
			newObject.set("RIN", String(rin));
		}
		if (photoRin) {
			newObject.set("_PHOTO_RIN", String(photoRin));
		}
		const clonNode = this.get("_CLON");
		if (clonNode) {
			newObject.set("_CLON", clonNode);
		}
		const mserNode = this.get("_MSER");
		if (mserNode) {
			newObject.set("_MSER", mserNode);
		}
		const oidNode = this.get("_OID");
		if (oidNode && !newObject.get("_OID")) {
			newObject.set("_OID", oidNode);
		}
		const lkidNode = this.get("_LKID");
		if (lkidNode && !newObject.get("_LKID")) {
			newObject.set("_LKID", lkidNode);
		}

		if (override) {
			// Drop flat 5.5.1 siblings so G7 nested FILE/FORM does not leave
			// leftover FORM/MEDI/TITL/NOTE on the same OBJE.
			this.remove("FILE");
			this.remove("FORM");
			this.remove("MEDI");
			this.remove("TITL");
			this.remove("NOTE");
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
