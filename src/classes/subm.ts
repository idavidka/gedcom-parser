import { type SubmKey } from "../types/types";
import type ISubm from "../interfaces/subm";

import { Common, createProxy } from "./common";
import type { ProxyOriginal } from "./common";
import { type GedComType } from "./gedcom";

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
