import type ISourceStructure from "../../../types/structures/source";
import { type SourKey } from "../../../types/types";
import type ISour from "../interfaces/sour";

import { Common, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { type GedComType } from "./gedcom";

export class Sour extends Common<string, SourKey> implements ISour {}

export type SourType = Sour & ISourceStructure;
export const createSour = (
	gedcom: GedComType,
	id?: SourKey,
	main?: Common,
	parent?: Common
): ProxyOriginal<SourType> => {
	return createProxy(
		new Sour(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<SourType>;
};
