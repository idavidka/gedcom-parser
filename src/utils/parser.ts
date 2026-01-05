import { Common, getListTag, isId } from "../classes/common";
import { Families } from "../classes/fams";
import { createGedCom } from "../classes/gedcom";
import { Indi } from "../classes/indi";
import type { IndiType } from "../classes/indi";
import { Individuals } from "../classes/indis";
import { List } from "../classes/list";
import { Objects } from "../classes/objes";
import { Repositories } from "../classes/repos";
import { Sources } from "../classes/sours";
import { Submitters } from "../classes/subms";
import {
	LINE_REG,
	MAX_FILE_SIZE_TO_SYNC,
	REF_LINE_REG,
} from "../constants/constants";
import type { Settings } from "../types/settings";
import { type ConvertType, type IdType, type MultiTag } from "../types/types";
import type { ListTag } from "../types/types";

import { create } from "./common-creator";
import { isDevelopment } from "./get-product-details";
import { getRawSize } from "./get-raw-size";

const isDev = isDevelopment();

// let lastTime: number | undefined;
// interface Props {
// 	index:
// 		| number
// 		| `${number}.${number}`
// 		| `${number}.${number}.${number}`
// 		| `${number}.${number}.${number}.${number}`;
// 	label?: string;
// 	lastTime?: number;
// }
// const printTime = (
// 	{
// 		index,
// 		label = "RunTimeTest",
// 		lastTime: lastTimeProp,
// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 	}: Props,
// 	...args: any[]
// ) => {
// 	// if (!isDev) {
// 	// 	return;
// 	// }
// 	if (lastTimeProp !== undefined) {
// 		lastTime = lastTimeProp;
// 	}
// 	const date = Date.now();
// 	const diff = lastTime === undefined ? "Not provided" : date - lastTime;
// 	const func = (
// 		diff === "Not provided" || diff <= 150
// 			? console.log
// 			: diff > 500
// 				? console.error
// 				: console.warn
// 	).bind(console);
// 	func(
// 		label,
// 		{
// 			index,
// 			date,
// 			diff,
// 		},
// 		...args
// 	);
// 	lastTime = date;
// };

const GedcomTree = {
	parse: function (content: string, options?: { settings?: Settings }) {
		return this.parseHierarchy(content, options);
	},
	parseHierarchy: function (
		content: string,
		options?: { settings?: Settings }
	) {
		// printTime{ index: 0, label: "[Debug]", lastTime: Date.now() });
		const { settings } = options ?? {};
		const { linkedPersons = "skip", linkingKey } = settings ?? {};

		const gedcom = createGedCom();
		gedcom.removeValue();
		const reg = LINE_REG;
		let key: string | undefined;
		let type: MultiTag | ConvertType;
		let idCheck: string;
		let value: string | undefined;
		let indent: number | undefined = 0;
		let prevIndent = 0;
		let curNode: Common = gedcom as Common;
		let prevNode: Common;
		let mainNode: Common | undefined;
		const curPar: Array<Common> = [];

		// printTime{ index: 1, label: "[Debug]" });
		let prevLineIndent = 0;
		let prevRefLines: string[] | undefined;
		let prevLines: string[] | undefined;

		const refMatch = content.match(REF_LINE_REG);
		// printTime{ index: 2, label: "[Debug]" });

		const refs =
			refMatch && Array.isArray(refMatch)
				? refMatch.reduce<Record<string, ListTag>>((acc, curr) => {
						const [_refIndent, refId, refType] = curr.split(" ");
						if (refId && refType) {
							acc[refId] = refType.toUpperCase() as ListTag;
						}

						return acc;
					}, {})
				: {};
		const links = new Individuals();
		const tags: Common[] = [];
		// printTime{ index: 3, label: "[Debug]" });

		let lines = `${content.replace(/\n0 TRLR(\r?\n)*$/, "")}\n0 TRLR\n`
			.split(/\r?\n/)
			.reduce<string[]>((acc, line) => {
				const lineMatch = line.match(LINE_REG);

				if (lineMatch) {
					const lineIndent = Number(lineMatch?.groups?.indent ?? 0);
					const lineValue = lineMatch?.groups?.value ?? "";
					if (
						lineIndent > 0 &&
						lineIndent > prevLineIndent &&
						lineValue &&
						isId(lineValue)
					) {
						const refLines = lineValue
							.split(/,\s*/)
							.map((id) => line.replace(lineValue, id));
						if (refLines.length > 1) {
							prevLineIndent = lineIndent;
							prevRefLines = refLines;
						} else {
							acc.push(line);
						}
					} else {
						if (prevRefLines) {
							if (lineIndent > prevLineIndent) {
								if (!prevLines) {
									prevLines = [];
								}
								prevLines.push(line);
							} else {
								prevRefLines.forEach((prevRefLine) => {
									acc.push(prevRefLine, ...(prevLines ?? []));
								});
								prevLineIndent = 0;
								prevRefLines = undefined;
								prevLines = undefined;
								acc.push(line);
							}
						} else {
							acc.push(line);
						}
					}
				} else {
					if (acc[acc.length - 1] !== undefined) {
						acc[acc.length - 1] = `${acc[acc.length - 1]}${line}`;
					}
				}
				return acc;
			}, []);

		let linesJoined = lines.join("\n");

		// printTime{ index: 4, label: "[Debug]" }, { lines: lines.join("\n") });
		if (
			!linesJoined.includes("1 _IS_PURGED true") &&
			getRawSize(linesJoined) > MAX_FILE_SIZE_TO_SYNC
		) {
			linesJoined = linesJoined
				.replace(
					/1\s(NOTE|OBJE|SOUR)([^\n]*\n)([23456789]\s.+\n)*/gm,
					""
				)
				.replace(/0\s(@[^@]+@)(\sSOUR[^\n]*\n)([123456789]\s.+\n)*/, "")
				.replace(/0 HEAD(.*)\n/, "0 HEAD$1\n1 _IS_PURGED true\n");

			lines = linesJoined.split("\n");

			// printTime{ index: 6, label: "[Debug]" }, { lines: lines.join("\n") });
		}

		lines.forEach((line: string, index: number) => {
			if (line.length === 0) {
				return; // skip empty
			}
			const match = reg.exec(line);

			if (match?.[1] === undefined) {
				throw new Error(`Can't parse line #${index}: ${line}`);
			}

			try {
				indent = Number(match[1]);

				if (indent > prevIndent + 1) {
					indent = prevIndent + 1;
				}

				if (match?.[2] !== undefined) {
					key = match?.[3] + match?.[2];
				} else {
					key = match?.[3];
				}
				value = match?.[4];
				[type, idCheck] = (key?.split("@") ?? []) as [MultiTag, string];
				type = type?.toUpperCase() as MultiTag;
				const id = idCheck ? `@${idCheck}@` : undefined;

				if (indent > prevIndent) {
					curPar.push(curNode);
					curNode = prevNode;
				} else if (indent < prevIndent) {
					for (let i = 0; i < prevIndent - indent; ++i) {
						curNode = curPar.pop() as Common;
					}
				}

				const newCommon = create(gedcom, type, id, {
					mainNode,
					curNode,
					prevNode,
				});
				prevNode = newCommon.prevNode;
				mainNode = newCommon.mainNode;

				if (prevNode instanceof Common) {
					if (mainNode instanceof Indi && type === "_MTTAG") {
						tags.push(prevNode);
					}

					if (value) {
						prevNode.value = value;

						if (isId(value) && refs[value]) {
							prevNode.refType = refs[value];
							mainNode?.addRef(prevNode);

							if (
								linkingKey &&
								linkingKey === type &&
								curNode instanceof Indi &&
								curNode?.id
							) {
								links.item(curNode.id, curNode);
							}
						}
					} else {
						prevNode.removeValue();
					}
				}

				if (type && type !== "value") {
					const curCommon = curNode as Common;
					if (id) {
						this.addToList(id, type, curCommon, prevNode);
					} else {
						curCommon.assign(type as MultiTag, prevNode);
					}
				}

				prevIndent = indent;
			} catch (err) {
				console.log("ASDXX", err);
				throw new Error(`Can't parse line #${index}: ${line}`, {
					cause: err,
				});
			}
		});

		if (tags.length) {
			gedcom.tagMembers = tags.reduce<
				Record<string, { tag: Common; indis: Individuals }>
			>((acc, tag) => {
				const tagName = tag?.get("NAME")?.toValue() as
					| string
					| undefined;

				if (
					!tagName ||
					!tag?.ref ||
					!tag?.main ||
					!(tag.main instanceof Indi)
				) {
					return acc;
				}

				if (!acc[tagName]) {
					acc[tagName] = {
						tag: tag.ref,
						indis: new Individuals(),
					};
				}

				acc[tagName].indis.append(tag.main as IndiType);

				return acc;
			}, {});
		}
		try {
			if ("@@INDI" in gedcom) {
				gedcom["@@INDI"] = gedcom["@@INDI"]?.filter((item) => {
					return !item.isIgnoredMember();
				});
			}
		} catch (err) {
			throw new Error(`Malformed GEDCOM`, {
				cause: err,
			});
		}

		if (linkingKey) {
			links.forEach((linkingIndi, _linkingId) => {
				const linking = linkingIndi as IndiType | undefined;
				const linked = (linking?.get(linkingKey) as Common | undefined)
					?.ref as IndiType | undefined;

				if (!linking) {
					return;
				}
				if (linkedPersons === "merge") {
					gedcom.mergeIndis(linked, linking);
				} else if (linkedPersons === "clone") {
					gedcom.cloneIndis(linked, linking, ["FAMS"]);
				}
			});
		}

		return { gedcom, raw: linesJoined };
	},
	addToList: function (
		id: string,
		type: MultiTag,
		common: Common,
		prev: Common
	) {
		const listTag = getListTag(type);
		let curValue = common.get<List>(listTag);
		if (type === "INDI" || type === "_INDI") {
			curValue = curValue || new Individuals();
		} else if (type === "FAM") {
			curValue = curValue || new Families();
		} else if (type === "OBJE") {
			curValue = curValue || new Objects();
		} else if (type === "REPO") {
			curValue = curValue || new Repositories();
		} else if (type === "SUBM") {
			curValue = curValue || new Submitters();
		} else if (type === "SOUR") {
			curValue = curValue || new Sources();
		} else {
			curValue = curValue || new List();
		}

		common.set(listTag, curValue);
		curValue.item(id as IdType, prev);
	},
};

if (isDev) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(globalThis as any).GedcomTree = GedcomTree;
}

export default GedcomTree;
