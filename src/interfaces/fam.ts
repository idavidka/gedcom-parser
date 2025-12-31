import { type FamKey } from "../types";
import { type Common } from "../classes/common";
import { type Individuals } from "../classes/indis";

interface IFam extends Common<string, FamKey> {
	_IS_ORPHAN_FAMILY?: Common<"Y" | "N">;

	getChildren: () => Individuals;

	getHusband: () => Individuals;

	getWife: () => Individuals;
}

export default IFam;
