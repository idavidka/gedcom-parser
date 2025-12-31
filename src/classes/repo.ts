import { type RepoKey } from "../types";
import type IRepo from "../interfaces/repo";

import { Common, createProxy } from "../classes/common";
import type { ProxyOriginal } from "../classes/common";
import { type GedComType } from "../classes/gedcom";

export class Repo extends Common<string, RepoKey> implements IRepo {}

export type RepoType = Repo & IRepositoryStructure;
export const createRepo = (
	gedcom: GedComType,
	id?: RepoKey,
	main?: Common,
	parent?: Common
): ProxyOriginal<RepoType> => {
	return createProxy(
		new Repo(gedcom, id, main, parent)
	) as unknown as ProxyOriginal<RepoType>;
};
