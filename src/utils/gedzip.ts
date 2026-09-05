/**
 * FamilySearch GEDZIP (GEDCOM 7) helpers.
 * Spec: https://gedcom.io/gedzip/
 *
 * A GEDZIP is a ZIP archive containing:
 * - `gedcom.ged` (GEDCOM 7 dataset)
 * - one entry per local FILE path (recommended under `media/`)
 */

import JSZip from "jszip";

import { resolveMediaContent } from "./local-media";

export const GEDZIP_MIME = "application/vnd.familysearch.gedcom+zip";
export const GEDZIP_EXTENSION = "gdz";
export const GEDZIP_GEDCOM_ENTRY = "gedcom.ged";

export type GedzipMediaInput = {
	/** Original FILE payload (usually an http(s) URL) to rewrite. */
	url: string;
	/**
	 * Media bytes as a data URL (`data:...;base64,...`), raw base64, or binary string.
	 * Optional until resolved by `downloadGedzipMedia` / host cache.
	 */
	content?: string;
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

export type ExtractedGedzipMedia = {
	path: string;
	content: Uint8Array;
};

export type ExtractedGedzip = {
	/** GEDCOM text (prefers `gedcom.ged`, else first `.ged`). */
	gedcomText: string;
	/** Archive entry name of the chosen GEDCOM file. */
	entryName: string;
	/** Non-GEDCOM zip entries (typically under `media/`). */
	mediaEntries: ExtractedGedzipMedia[];
};

const normalizeZipPath = (name: string) =>
	name.replace(/\\/g, "/").replace(/^\.\//, "");

const MIME_BY_EXT: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	bmp: "image/bmp",
	tif: "image/tiff",
	tiff: "image/tiff",
	svg: "image/svg+xml",
	pdf: "application/pdf",
};

const mimeForPath = (path: string) => {
	const ext = (path.split(".").pop() || "").toLowerCase();
	return MIME_BY_EXT[ext] || "application/octet-stream";
};

const bytesToBase64 = (bytes: Uint8Array) => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(bytes).toString("base64");
	}
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
};

export const bytesToDataUrl = (bytes: Uint8Array, mime: string) =>
	`data:${mime};base64,${bytesToBase64(bytes)}`;

/**
 * Rewrite local FILE paths from a GEDZIP (`media/...`) to embedded data URLs
 * so the dataset is self-contained after import.
 */
export const remountGedzipMediaAsDataUrls = (
	extracted: ExtractedGedzip
): string => {
	if (!extracted.mediaEntries.length) {
		return extracted.gedcomText;
	}

	const pathToDataUrl = new Map<string, string>();
	for (const media of extracted.mediaEntries) {
		const path = normalizeZipPath(media.path);
		const dataUrl = bytesToDataUrl(media.content, mimeForPath(path));
		pathToDataUrl.set(path, dataUrl);
		pathToDataUrl.set(`./${path}`, dataUrl);
		const base = path.split("/").pop();
		if (base) {
			pathToDataUrl.set(base, dataUrl);
			pathToDataUrl.set(`media/${base}`, dataUrl);
		}
	}

	return rewriteGedcomFilePaths(extracted.gedcomText, pathToDataUrl);
};

/**
 * Extract GEDCOM text (and optional media bytes) from a ZIP / GEDZIP archive.
 */
export const extractGedzip = async (
	data: ArrayBuffer | Uint8Array | Blob
): Promise<ExtractedGedzip> => {
	const zip = await JSZip.loadAsync(data);
	const entries = Object.values(zip.files).filter((entry) => !entry.dir);

	const preferred =
		entries.find(
			(entry) =>
				normalizeZipPath(entry.name).toLowerCase() ===
				GEDZIP_GEDCOM_ENTRY
		) ??
		entries.find((entry) =>
			normalizeZipPath(entry.name).toLowerCase().endsWith(".ged")
		);

	if (!preferred) {
		throw new Error("No .ged file found in the archive.");
	}

	const gedcomText = await preferred.async("string");
	const mediaEntries: ExtractedGedzipMedia[] = [];

	for (const entry of entries) {
		const path = normalizeZipPath(entry.name);
		if (path === normalizeZipPath(preferred.name)) {
			continue;
		}
		if (path.toLowerCase().endsWith(".ged")) {
			continue;
		}
		mediaEntries.push({
			path,
			content: await entry.async("uint8array"),
		});
	}

	return {
		gedcomText,
		entryName: normalizeZipPath(preferred.name),
		mediaEntries,
	};
};

/**
 * Extract a GEDZIP and optionally embed `media/` files as data-URL FILE payloads.
 */
export const extractGedzipGedcom = async (
	data: ArrayBuffer | Uint8Array | Blob,
	options?: { embedMediaAsDataUrls?: boolean }
): Promise<string> => {
	const extracted = await extractGedzip(data);
	if (options?.embedMediaAsDataUrls === false) {
		return extracted.gedcomText;
	}
	return remountGedzipMediaAsDataUrls(extracted);
};

/** True for `.gdz` / FamilySearch GEDZIP MIME / generic zip containers. */
export const isGedzipContainer = (file: {
	name?: string;
	type?: string;
}) => {
	const name = (file.name || "").toLowerCase();
	const type = (file.type || "").toLowerCase();
	return (
		name.endsWith(`.${GEDZIP_EXTENSION}`) ||
		name.endsWith(".zip") ||
		type === GEDZIP_MIME ||
		type === "application/zip" ||
		type === "application/x-zip-compressed"
	);
};

export type DownloadableGedzipMedia = GedzipMediaInput & {
	key?: string;
	downloaded?: boolean;
	tree?: string;
	person?: string;
	downloadName?: string;
};

/**
 * Resolve media payloads via injected host cache / local paths / fetch.
 * Failures are skipped so GEDZIP remains valid with `gedcom.ged` only.
 */
export const downloadGedzipMedia = async (
	media: Record<string, DownloadableGedzipMedia | GedzipMediaInput>,
	onProgress?: (done: number, total: number) => void
): Promise<GedzipMediaInput[]> => {
	const entries = Object.values(media).filter((item) => !!item.url);
	const total = entries.length;
	let done = 0;
	const downloaded: GedzipMediaInput[] = [];

	await Promise.all(
		entries.map(async (item) => {
			try {
				const resolved = await resolveMediaContent({
					url: item.url,
					id: item.id,
					imgId: item.imgId,
					key: "key" in item ? item.key : undefined,
					contentType: item.contentType,
				});
				if (!resolved?.content) {
					return;
				}
				downloaded.push({
					...item,
					content: resolved.content,
					contentType: resolved.contentType || item.contentType,
				});
			} catch {
				// Skip unreachable media.
			} finally {
				done += 1;
				onProgress?.(done, total);
			}
		})
	);

	return downloaded;
};

/** Pack GEDCOM text + media into a GEDZIP Blob. */
export const buildGedzipBlob = async (
	gedcomText: string,
	mediaFiles: GedzipMediaInput[] = []
): Promise<Blob> => {
	const bytes = await buildGedzip(gedcomText, mediaFiles);
	// Copy into a fresh ArrayBuffer-backed view for BlobPart (TS 5.x BufferSource).
	const part = new Uint8Array(bytes.byteLength);
	part.set(bytes);
	return new Blob([part], { type: GEDZIP_MIME });
};
