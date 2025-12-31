import { type SourKey } from "../types";
import type ISour from "../interfaces/sour";

import { Common, createProxy } from "../classes/common";
import type { ProxyOriginal } from "../classes/common";
import { type GedComType } from "../classes/gedcom";

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
