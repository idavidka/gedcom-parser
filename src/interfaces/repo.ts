import type IRepositoryStructure from "../../../types/structures/repository";
import { type RepoKey } from "../../../types/types";
import { type Common } from "../classes/common";

interface IRepo extends Common<string, RepoKey>, IRepositoryStructure {}

export default IRepo;
