import { type Common } from "../../classes/gedcom/classes/common";
import type { Families } from "../../classes/gedcom/classes/fams";
import type { Individuals } from "../../classes/gedcom/classes/indis";
import type { List } from "../../classes/gedcom/classes/list";
import type { Objects } from "../../classes/gedcom/classes/objes";
import type { Repositories } from "../../classes/gedcom/classes/repos";
import type { Sources } from "../../classes/gedcom/classes/sours";
import type { Submitters } from "../../classes/gedcom/classes/subms";
import { type NonStandard } from "../types";
import type { ListTag } from "../types";

import type IAddressStructure from "./address";
import type INoteStructure from "./note";

interface IGedComStructure
	extends
		Common,
		Omit<NonStandard, "id" | "value">,
		Partial<Record<`${ListTag}`, List>> {
	"@@INDI"?: Individuals;
	"@@_INDI"?: Individuals;
	"@@FAM"?: Families;
	"@@OBJE"?: Objects;
	"@@REPO"?: Repositories;
	"@@SOUR"?: Sources;
	"@@SUBM"?: Submitters;
	HEAD?: Common & {
		GEDC?: Common & {
			VERS?: Common;
		};
		SCHMA?: Common & {
			TAG?: Common;
		};
		SOUR?: Common & {
			VERS?: Common;
			NAME?: Common;
			CORP?: Common & {
				PHON?: Common;
				EMAIL?: Common;
				FAX?: Common;
				WWW?: Common;
			} & IAddressStructure;
			DATA?: Common & {
				DATE?: Common & {
					TIME?: Common;
				};
				CORP?: Common;
			};
			_TREE?: Common & {
				RIN?: Common;
			};
		};

		DEST?: Common;
		DATE?: Common & {
			TIME?: Common;
		};
		SUBM?: Common;
		CORP?: Common;
		LANG?: Common;
		PLAC?: Common & {
			FORM?: Common;
		};
	} & INoteStructure;
}
export default IGedComStructure;
