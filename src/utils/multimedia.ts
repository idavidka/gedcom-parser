import type { MediaList } from "../interfaces/indi";
import type { IndiKey, ObjeKey } from "../types/types";
import type { GedcomExportVersion } from "./gedcom-version";
import { getFileExtension } from "./media-utils";

export type CreateMultimediaInput = {
	/** FILE payload: URL or relative GEDZIP path. */
	file: string;
	/** Format / extension (jpg, png, …). Inferred from `file` when omitted. */
	form?: string;
	title?: string;
	/**
	 * GEDCOM 7 `FILE.FORM.TYPE` (e.g. `photo`, `audio`, `video`, `document`).
	 * Written only for GEDCOM 7 nesting.
	 */
	mediType?: string;
	primary?: boolean;
	/**
	 * Structure style for the OBJE record. Defaults to the dataset HEAD version
	 * (or 5.5.1).
	 */
	gedcomVersion?: GedcomExportVersion | string;
};

export type AttachMultimediaOptions = {
	primary?: boolean;
};

export type CollectMultimediaOptions = {
	indiIds?: IndiKey[];
	namespace?: string | number;
};

/**
 * Infer a short FORM token from a path/URL (best-effort).
 */
export const inferMediaForm = (file: string, fallback = "bin") => {
	const withoutQuery = file.split("?")[0] || file;
	const ext = getFileExtension(withoutQuery);
	if (ext) {
		return ext.toLowerCase() === "jpeg" ? "jpg" : ext.toLowerCase();
	}
	return fallback;
};

/**
 * Merge MediaList maps (later entries overwrite same keys).
 */
export const mergeMediaLists = (...lists: Array<MediaList | undefined>) => {
	const merged: MediaList = {};
	for (const list of lists) {
		if (!list) continue;
		Object.assign(merged, list);
	}
	return merged;
};

export const isObjePointer = (value: unknown): value is ObjeKey =>
	typeof value === "string" && /^@O\d+@$/.test(value);
