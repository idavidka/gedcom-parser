const TRAILER_LINE = /^0 TRLR\s*$/i;

export const GEDCOM_TRAILER_TAG = "TRLR";

export const isGedcomTrailerTag = (tag: string) => tag === GEDCOM_TRAILER_TAG;

export const isGedcomTrailerLine = (line: string) => TRAILER_LINE.test(line);

/** File terminator only — TRLR is not a stored GEDCOM record. */
export const appendGedcomTrailer = (serialized: string) => {
	const newline = serialized.includes("\r\n") ? "\r\n" : "\n";
	const trimmed = serialized.replace(/(?:\r?\n)+$/, "");
	if (!trimmed) {
		return "0 TRLR";
	}

	const lastLine = trimmed.split(/\r?\n/).at(-1) ?? "";
	if (isGedcomTrailerLine(lastLine)) {
		return trimmed;
	}

	return `${trimmed}${newline}0 TRLR`;
};
