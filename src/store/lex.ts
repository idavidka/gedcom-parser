import { LINE_REG } from "../constants/constants";
import { isGedcomTrailerLine } from "../utils/gedcom-trailer";

import type { LexBlock, LexResult } from "./types";

const BOM_RE = /^\uFEFF+/;

type PhysicalLine = {
	/** Line content without the trailing newline. */
	text: string;
	/** Exact trailing newline for this line (`\n`, `\r\n`, `\r`, or ``). */
	nl: string;
	/** Start offset in `body` (after BOM). */
	start: number;
	/** End offset in `body` (exclusive), including newline. */
	end: number;
};

/**
 * Split `body` into physical lines while keeping each line's exact newline.
 */
const splitPhysicalLines = (body: string): PhysicalLine[] => {
	const lines: PhysicalLine[] = [];
	let i = 0;
	while (i < body.length) {
		const start = i;
		let textEnd = i;
		while (textEnd < body.length) {
			const ch = body[textEnd];
			if (ch === "\n" || ch === "\r") {
				break;
			}
			textEnd += 1;
		}
		let nl = "";
		let end = textEnd;
		if (textEnd < body.length) {
			if (body[textEnd] === "\r" && body[textEnd + 1] === "\n") {
				nl = "\r\n";
				end = textEnd + 2;
			} else if (body[textEnd] === "\r" || body[textEnd] === "\n") {
				nl = body[textEnd];
				end = textEnd + 1;
			}
		}
		lines.push({
			text: body.slice(start, textEnd),
			nl,
			start,
			end,
		});
		i = end;
	}
	return lines;
};

const level0Match = (text: string) => {
	const match = text.match(LINE_REG);
	if (!match?.groups) {
		return undefined;
	}
	const indent = Number(match.groups.indent ?? -1);
	if (indent !== 0) {
		return undefined;
	}
	return {
		type: (match.groups.type ?? "").toUpperCase(),
		xref: match[2] as string | undefined,
		value: match.groups.value ?? "",
	};
};

const recordId = (tag: string, xref?: string): string => {
	if (xref) {
		return xref.replace(/@/g, "");
	}
	if (tag === "HEAD") {
		return "HEAD";
	}
	return tag;
};

/**
 * Lex a GEDCOM string into level-0 blocks with exact `source` slices.
 * Does not build class instances. CONC folding and FILE inject happen when
 * producing `logicalLines` for the builder — `source` stays byte-identical.
 */
export const lexGedcom = (
	content: string,
	options?: { filename?: string }
): LexResult => {
	const bomMatch = content.match(BOM_RE);
	const bom = bomMatch?.[0] ?? "";
	const body = bom ? content.slice(bom.length) : content;
	const physical = splitPhysicalLines(body);
	const filename = options?.filename ?? "";

	const blocks: LexBlock[] = [];
	let trailer = "";
	let order = 0;

	let blockStart = 0;
	let blockLines: PhysicalLine[] = [];
	let currentTag: string | undefined;
	let currentId: string | undefined;
	let inHead = false;
	let hasFile = false;

	const flushBlock = (endOffset: number) => {
		if (!currentTag || blockLines.length === 0) {
			return;
		}
		const source = body.slice(blockStart, endOffset);
		const logicalLines = buildLogicalLines(blockLines, {
			inHead: currentTag === "HEAD",
			hasFile,
			filename,
		});
		blocks.push({
			id: currentId ?? recordId(currentTag),
			tag: currentTag,
			order,
			source,
			logicalLines,
		});
		order += 1;
		blockLines = [];
		currentTag = undefined;
		currentId = undefined;
		inHead = false;
		hasFile = false;
	};

	for (let i = 0; i < physical.length; i++) {
		const line = physical[i];
		const zero = level0Match(line.text);

		if (zero) {
			if (zero.type === "TRLR" || isGedcomTrailerLine(line.text)) {
				flushBlock(line.start);
				trailer = body.slice(line.start);
				// Trailer consumes the rest of the file (including trailing junk).
				break;
			}

			flushBlock(line.start);
			blockStart = line.start;
			currentTag = zero.type;
			currentId = recordId(zero.type, zero.xref);
			inHead = zero.type === "HEAD";
			hasFile = false;
			blockLines = [line];
			continue;
		}

		if (currentTag) {
			if (
				inHead &&
				LINE_REG.test(line.text) &&
				Number(line.text.match(LINE_REG)?.groups?.indent) === 1 &&
				(line.text.match(LINE_REG)?.groups?.type ?? "").toUpperCase() ===
					"FILE"
			) {
				hasFile = true;
			}
			blockLines.push(line);
		}
		// Leading junk before the first level-0 record is ignored for blocks;
		// byte-identity tests require a well-formed file starting at HEAD/BOM.
	}

	if (currentTag) {
		flushBlock(body.length);
	}

	return { bom, trailer, blocks, body };
};

/**
 * Build the logical line stream the existing builder expects: CONC folded,
 * optional FILE inject when leaving HEAD, no TRLR.
 */
const buildLogicalLines = (
	lines: PhysicalLine[],
	ctx: { inHead: boolean; hasFile: boolean; filename: string }
): string[] => {
	const acc: string[] = [];
	let inHead = ctx.inHead;
	let hasFile = ctx.hasFile;
	const filename = ctx.filename;
	let prevLineIndent = 0;
	let prevRefLines: string[] | undefined;
	let prevLines: string[] | undefined;

	const pushLeavingHead = () => {
		if (inHead && filename && !hasFile) {
			acc.push(`1 FILE ${filename}`);
		}
		inHead = false;
	};

	for (const line of lines) {
		const text = line.text;
		const lineMatch = text.match(LINE_REG);

		if (lineMatch) {
			const lineIndent = Number(lineMatch.groups?.indent ?? 0);
			const lineValue = lineMatch.groups?.value ?? "";
			const lineType = (lineMatch.groups?.type ?? "").toUpperCase();

			if (lineIndent === 0 && lineType === "HEAD") {
				acc.push(text);
				inHead = true;
				hasFile = false;
				continue;
			}

			if (lineIndent === 0) {
				pushLeavingHead();
				acc.push(text);
				continue;
			}

			if (inHead && lineIndent === 1 && lineType === "FILE") {
				hasFile = true;
			}

			if (lineType === "CONC") {
				const last = acc[acc.length - 1];
				if (last !== undefined) {
					acc[acc.length - 1] = `${last}${lineValue}`;
					continue;
				}
			}

			if (
				lineIndent > 0 &&
				lineIndent > prevLineIndent &&
				lineValue &&
				/^@[_a-zA-Z0-9]+@$/.test(lineValue)
			) {
				const refLines = lineValue
					.split(/,\s*/)
					.map((id) => text.replace(lineValue, id));
				if (refLines.length > 1) {
					prevLineIndent = lineIndent;
					prevRefLines = refLines;
					continue;
				}
			}

			if (prevRefLines) {
				if (lineIndent > prevLineIndent) {
					if (!prevLines) {
						prevLines = [];
					}
					prevLines.push(text);
				} else {
					prevRefLines.forEach((prevRefLine) => {
						acc.push(prevRefLine, ...(prevLines ?? []));
					});
					prevLineIndent = 0;
					prevRefLines = undefined;
					prevLines = undefined;
					acc.push(text);
				}
			} else {
				acc.push(text);
			}
		} else if (acc[acc.length - 1] !== undefined) {
			acc[acc.length - 1] = `${acc[acc.length - 1]}${text}`;
		}
	}

	if (prevRefLines) {
		prevRefLines.forEach((prevRefLine) => {
			acc.push(prevRefLine, ...(prevLines ?? []));
		});
	}

	pushLeavingHead();
	return acc.filter((l) => l.length > 0 && !isGedcomTrailerLine(l));
};

/**
 * Concatenate stored slices into the exact imported text.
 * Used by clean `toGedcom` — must not go through the rewriting serializer.
 */
export const concatenateSources = (
	bom: string,
	records: Array<{ order: number; source: string }>,
	trailer: string
): string => {
	const sorted = [...records].sort((a, b) => a.order - b.order);
	return bom + sorted.map((r) => r.source).join("") + trailer;
};
