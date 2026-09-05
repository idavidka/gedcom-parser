/**
 * Get file extension from a filename, URL, or data URL.
 */
import type { MultiTag } from "../types/types";

export const getFileExtension = (filename: string): string => {
	if (!filename) {
		return "";
	}
	if (filename.startsWith("data:")) {
		const mime = filename.slice(5).split(";")[0] || "";
		const subtype = (mime.split("/")[1] || "").toLowerCase();
		if (subtype === "jpeg") {
			return "jpg";
		}
		return subtype.split("+")[0] || "";
	}
	const withoutQuery = filename.split(/[?#]/)[0] || filename;
	const match = withoutQuery.match(/\.([^.]+)$/);
	return match ? match[1].toLowerCase() : "";
};

/**
 * Check if a file format is an image format.
 * Accepts extensions (`jpg`), MIME subtypes, or full `data:image/...` URLs.
 */
export const isImageFormat = (format: string): boolean => {
	if (!format) {
		return false;
	}
	let normalized = format.toLowerCase().trim();
	if (normalized.startsWith("data:")) {
		normalized = getFileExtension(normalized);
	} else if (normalized.includes("/")) {
		normalized = normalized.split("/")[1]?.split("+")[0] || "";
		if (normalized === "jpeg") {
			normalized = "jpg";
		}
	}
	const imageFormats = [
		"jpg",
		"jpeg",
		"png",
		"gif",
		"bmp",
		"webp",
		"svg",
		"tiff",
		"tif",
	];
	return imageFormats.includes(normalized);
};

/** Resolve FORM / media type from flat (5.5.1) or nested (GEDCOM 7) OBJE. */
export const resolveObjeForm = (obje?: {
	get?: (path: MultiTag) => { toValue?: () => unknown } | undefined;
}): string | undefined => {
	const value =
		obje?.get?.("FILE.FORM")?.toValue?.() ??
		obje?.get?.("FORM")?.toValue?.();
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
};
