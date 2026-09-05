/**
 * FamilySearch GEDZIP (GEDCOM 7) helpers.
 * Spec: https://gedcom.io/gedzip/
 *
 * A GEDZIP is a ZIP archive containing:
 * - `gedcom.ged` (GEDCOM 7 dataset)
 * - one entry per local FILE path (recommended under `media/`)
 */

import JSZip from "jszip";

export const GEDZIP_MIME = "application/vnd.familysearch.gedcom+zip";
export const GEDZIP_EXTENSION = "gdz";
export const GEDZIP_GEDCOM_ENTRY = "gedcom.ged";

export type GedzipMediaInput = {
	/** Original FILE payload (usually an http(s) URL) to rewrite. */
	url: string;
	/**
	 * Media bytes as a data URL (`data:...;base64,...`), raw base64, or binary string.
	 */
	content: string;
	contentType?: string;
	id?: string;
	imgId?: string;
	title?: string;
};

const sanitizePathSegment = (name: string) =>
	name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "") || "file";

const extensionFor = (contentType?: string) => {
	const raw = (contentType || "bin").replace(/^\./, "").toLowerCase();
	if (raw.includes("/")) {
		return raw.split("/").pop() || "bin";
	}
	return raw || "bin";
};

/**
 * Rewrite `n FILE <url>` payloads to local GEDZIP paths (`media/...`).
 */
export const rewriteGedcomFilePaths = (
	gedcomText: string,
	urlToPath: Map<string, string> | Record<string, string>
) => {
	const entries =
		urlToPath instanceof Map
			? urlToPath
			: new Map(Object.entries(urlToPath));

	let text = gedcomText;
	entries.forEach((path, url) => {
		const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		text = text.replace(
			new RegExp(`(^|\\r?\\n)(\\d+ FILE )${escaped}`, "g"),
			`$1$2${path}`
		);
	});
	return text;
};

const assignMediaPaths = (mediaFiles: GedzipMediaInput[]) => {
	const urlToPath = new Map<string, string>();
	const usedPaths = new Set<string>([GEDZIP_GEDCOM_ENTRY]);
	const files: Array<{
		path: string;
		content: string;
		base64: boolean;
		url: string;
	}> = [];

	for (const file of mediaFiles) {
		if (!file.content || !file.url) {
			continue;
		}

		const ext = extensionFor(file.contentType);
		const base = sanitizePathSegment(
			file.imgId || file.title || file.id || "media"
		);
		let path = `media/${base}.${ext}`;
		let suffix = 1;
		while (usedPaths.has(path)) {
			path = `media/${base}-${suffix++}.${ext}`;
		}
		usedPaths.add(path);
		urlToPath.set(file.url, path);

		const marker = "base64,";
		const idx = file.content.indexOf(marker);
		if (idx >= 0) {
			files.push({
				path,
				url: file.url,
				content: file.content.substring(idx + marker.length),
				base64: true,
			});
		} else {
			files.push({
				path,
				url: file.url,
				content: file.content,
				base64: false,
			});
		}
	}

	return { urlToPath, files };
};

/**
 * Build a FamilySearch GEDZIP as bytes (`.gdz`).
 * Caller supplies already-downloaded media; this only formats the archive.
 */
export const buildGedzip = async (
	gedcomText: string,
	mediaFiles: GedzipMediaInput[] = []
): Promise<Uint8Array> => {
	const zip = new JSZip();
	const { urlToPath, files } = assignMediaPaths(mediaFiles);

	for (const file of files) {
		zip.file(file.path, file.content, { base64: file.base64 });
	}

	zip.file(GEDZIP_GEDCOM_ENTRY, rewriteGedcomFilePaths(gedcomText, urlToPath));

	return zip.generateAsync({ type: "uint8array" });
};
