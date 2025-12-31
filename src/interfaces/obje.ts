import { type ObjeKey } from "../types";
import { type Common } from "../classes/common";

interface IObje extends Common<string, ObjeKey> {
	_PRIM?: Common<"Y" | "N">;
}

export default IObje;
