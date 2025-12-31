import { type Common } from "../classes/common";
import { type RepoKey } from "../types";
import type IRepositoryStructure from "./repository";

interface IRepo extends Common<string, RepoKey>, IRepositoryStructure {}

export default IRepo;
