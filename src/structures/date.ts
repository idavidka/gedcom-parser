import type {Common} from "../classes/common";
import type {CommonDate} from "../classes/date";

interface IDateStructure extends Common {
	DATE?: CommonDate & {
		TIME?: Common;
	};
}

export default IDateStructure;
