import { type SubmKey } from "../types";
import type ISubm from "../interfaces/subm";

import { Common, createProxy } from "../classes/common";
import type { ProxyOriginal } from "../classes/common";
import { type GedComType } from "../classes/gedcom";

export class Subm extends Common<string, SubmKey> implements ISubm {}

export type SubmType = Subm & ISubm;
export const createSubm = (
	gedcom: GedComType,
	id?: SubmKey,
	main?: Common,
	parent?: Common
): ProxyOriginal<SubmType> => {
	return createProxy(
		new Subm(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<SubmType>;
};
