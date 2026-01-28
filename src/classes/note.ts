import type { IdType } from "../types/types";

import { Common, createCommon, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import type { GedComType } from "./gedcom";
import { List } from "./list";

export class CommonNote extends Common<string> {
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
		const [note, ...contents] = value?.split(/\r?\n/) ?? [];

		this._value = note;

		if (contents.length) {
			const newContents = new List();

			contents.forEach((c, i) => {
				const newContent = createCommon(
					this._gedcom,
					undefined,
					this.main
				);
				newContent.id = `@U${i}@`;
				newContent.value = c;
				newContents.append(newContent);
			});

			const firstItem = newContents.index(0);
			if (firstItem) {
				if (newContents.length === 1) {
					this.set("CONT", firstItem);
				} else {
					this.set("CONT", newContents);
				}
			}
		}
	}

	get value() {
		const contents = this.get("CONT")
			?.toList()
			.map((content) => content.value)
			.join("\n");

		if (contents) {
			return `${this._value}\n${contents}`;
		}

		return this._value;
	}

	exportValue() {
		return this._value;
	}
}

export const createCommonNote = (
	gedcom?: GedComType,
	id?: IdType,
	main?: Common,
	parent?: Common
): ProxyOriginal<CommonNote> => {
	return createProxy(
		new CommonNote(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<CommonNote>;
};
