import { type SourKey } from "../types";
import { type Common } from "../classes/common";

interface ISour extends Common<string, SourKey> {
	_APID?: Common;
}

export default ISour;
