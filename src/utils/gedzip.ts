/**
 * FamilySearch GEDZIP (GEDCOM 7) helpers.
 * Spec: https://gedcom.io/gedzip/
 *
 * A GEDZIP is a ZIP archive containing:
 * - `gedcom.ged` (GEDCOM 7 dataset)
 * - one entry per local FILE path (recommended under `media/`)
 */

import JSZip from "jszip";

import {
	isEmbeddableMediaContent,
	resolveMediaContent,
} from "./local-media";

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

	zip.file(
		GEDZIP_GEDCOM_ENTRY,
		rewriteGedcomFilePaths(gedcomText, urlToPath)
	);

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

	// TextDecoder drops a leading UTF-8 BOM. JSZip's async("string") keeps
	// U+FEFF, which is how Geni zip exports lose their `0 HEAD` line.
	const gedcomBytes = await preferred.async("uint8array");
	const gedcomText = new TextDecoder("utf-8").decode(gedcomBytes);
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
export const isGedzipContainer = (file: { name?: string; type?: string }) => {
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
	treeName?: string;
	person?: string;
	downloadName?: string;
};

export type WriteGedzipResult = {
	total: number;
	written: number;
	failed: number;
};

/** Picture-only archive had media descriptors but none could be resolved. */
export class GedzipMediaEmptyError extends Error {
	readonly total: number;

	constructor(total: number) {
		super(
			total === 1
				? "Could not download the picture for this export"
				: `Could not download any of the ${total} pictures for this export`
		);
		this.name = "GedzipMediaEmptyError";
		this.total = total;
	}
}

const mediaLookupFromItem = (
	item: DownloadableGedzipMedia | GedzipMediaInput
) => ({
	url: item.url,
	id: item.id,
	imgId: item.imgId,
	key: "key" in item ? item.key : undefined,
	contentType: item.contentType,
	person: "person" in item ? item.person : undefined,
	tree: "tree" in item ? item.tree : undefined,
	treeName: "treeName" in item ? item.treeName : undefined,
});

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
				const resolved = await resolveMediaContent(
					mediaLookupFromItem(item)
				);
				if (!isEmbeddableMediaContent(resolved?.content)) {
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

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
})();

const crc32 = (bytes: Uint8Array): number => {
	let c = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
};

const decodeMediaBytes = (content: string): Uint8Array => {
	const marker = "base64,";
	const idx = content.startsWith("data:") ? content.indexOf(marker) : -1;
	if (idx >= 0) {
		const binary = atob(content.slice(idx + marker.length));
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}
	const bytes = new Uint8Array(content.length);
	for (let i = 0; i < content.length; i++) {
		bytes[i] = content.charCodeAt(i) & 0xff;
	}
	return bytes;
};

type StoredZipEntry = {
	name: Uint8Array;
	crc: number;
	size: number;
	offset: number;
};

const localHeader = (name: Uint8Array, crc: number, size: number) => {
	const header = new Uint8Array(30 + name.length);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x04034b50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, 0x0800, true);
	view.setUint16(8, 0, true);
	view.setUint32(14, crc, true);
	view.setUint32(18, size, true);
	view.setUint32(22, size, true);
	view.setUint16(26, name.length, true);
	header.set(name, 30);
	return header;
};

const centralHeader = (file: StoredZipEntry) => {
	const header = new Uint8Array(46 + file.name.length);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x02014b50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, 20, true);
	view.setUint16(8, 0x0800, true);
	view.setUint32(16, file.crc, true);
	view.setUint32(20, file.size, true);
	view.setUint32(24, file.size, true);
	view.setUint16(28, file.name.length, true);
	view.setUint32(42, file.offset, true);
	header.set(file.name, 46);
	return header;
};

const endOfCentralDirectory = (
	count: number,
	cdSize: number,
	cdOffset: number
) => {
	const header = new Uint8Array(22);
	const view = new DataView(header.buffer);
	view.setUint32(0, 0x06054b50, true);
	view.setUint16(8, count, true);
	view.setUint16(10, count, true);
	view.setUint32(12, cdSize, true);
	view.setUint32(16, cdOffset, true);
	return header;
};

const nextMediaPath = (
	item: GedzipMediaInput,
	contentType: string | undefined,
	usedPaths: Set<string>
) => {
	const ext = extensionFor(contentType || item.contentType);
	const base = sanitizePathSegment(
		item.imgId || item.title || item.id || "media"
	);
	let path = `media/${base}.${ext}`;
	let suffix = 1;
	while (usedPaths.has(path)) {
		path = `media/${base}-${suffix++}.${ext}`;
	}
	usedPaths.add(path);
	return path;
};

export type GedzipChunkSink = {
	write: (chunk: Uint8Array) => Promise<void> | void;
};

/**
 * Write a GEDZIP one image at a time.
 * Each picture is dropped after it is written, so the tab does not keep
 * every file until the archive is finished.
 */
export const writeGedzip = async (
	gedcomText: string,
	media: Record<string, DownloadableGedzipMedia | GedzipMediaInput>,
	sink: GedzipChunkSink,
	onProgress?: (done: number, total: number) => void,
	options?: {
		includeGedcom?: boolean;
		/** Extra entry written after the pictures, such as GenoPro `Data.xml`. */
		trailer?: {
			name: string;
			bytes: (
				paths: Map<string, string>
			) => Uint8Array | Promise<Uint8Array>;
		};
		/**
		 * When true (picture-only packs), throw if every image failed so the
		 * caller does not save a 22-byte empty zip.
		 */
		requireMedia?: boolean;
	}
): Promise<WriteGedzipResult> => {
	const includeGedcom = options?.includeGedcom !== false;
	const entries = Object.values(media).filter((item) => !!item?.url);
	const stored: StoredZipEntry[] = [];
	const usedPaths = new Set<string>([
		...(includeGedcom ? [GEDZIP_GEDCOM_ENTRY] : []),
		...(options?.trailer ? [options.trailer.name] : []),
	]);
	const urlToPath = new Map<string, string>();
	let offset = 0;
	let written = 0;
	const encoder = new TextEncoder();

	const append = async (chunk: Uint8Array) => {
		await sink.write(chunk);
		offset += chunk.length;
		if (offset > 0xffffffff) {
			throw new Error("GEDZIP exceeds 4 GB");
		}
	};

	const writeStored = async (path: string, bytes: Uint8Array) => {
		const name = encoder.encode(path);
		const crc = crc32(bytes);
		const header = localHeader(name, crc, bytes.length);
		stored.push({ name, crc, size: bytes.length, offset });
		await append(header);
		await append(bytes);
	};

	for (let i = 0; i < entries.length; i++) {
		const item = entries[i];
		try {
			let content = item.content;
			let contentType = item.contentType;
			if (!isEmbeddableMediaContent(content)) {
				const resolved = await resolveMediaContent(
					mediaLookupFromItem(item)
				);
				content = resolved?.content;
				contentType = resolved?.contentType || contentType;
			}
			if (isEmbeddableMediaContent(content)) {
				const path = nextMediaPath(item, contentType, usedPaths);
				urlToPath.set(item.url, path);
				await writeStored(path, decodeMediaBytes(content));
				written += 1;
			}
		} catch {
			// Skip one unreachable image; the GEDCOM entry is still written.
		}
		onProgress?.(i + 1, entries.length);
		await new Promise((resolve) => setTimeout(resolve, 0));
	}

	const failed = entries.length - written;
	if (
		options?.requireMedia &&
		entries.length > 0 &&
		written === 0 &&
		!includeGedcom &&
		!options.trailer
	) {
		throw new GedzipMediaEmptyError(entries.length);
	}

	if (includeGedcom) {
		await writeStored(
			GEDZIP_GEDCOM_ENTRY,
			encoder.encode(rewriteGedcomFilePaths(gedcomText, urlToPath))
		);
	}

	if (options?.trailer) {
		await writeStored(
			options.trailer.name,
			await options.trailer.bytes(urlToPath)
		);
	}

	if (stored.length > 0xffff) {
		throw new Error("GEDZIP has too many files");
	}

	const cdOffset = offset;
	for (const file of stored) {
		await append(centralHeader(file));
	}
	await append(
		endOfCentralDirectory(stored.length, offset - cdOffset, cdOffset)
	);

	return { total: entries.length, written, failed };
};

/**
 * Build a GEDZIP one image at a time.
 * Prefer `writeGedzip` when the file can be written straight to disk.
 * Always copy chunk bytes so later writes cannot alias Blob parts.
 */
export const packGedzipBlob = async (
	gedcomText: string,
	media: Record<string, DownloadableGedzipMedia | GedzipMediaInput>,
	onProgress?: (done: number, total: number) => void
): Promise<Blob> => {
	const parts: Uint8Array[] = [];
	await writeGedzip(
		gedcomText,
		media,
		{
			write: (chunk) => {
				parts.push(chunk.slice());
			},
		},
		onProgress
	);
	return new Blob(parts, { type: GEDZIP_MIME });
};

/**
 * One stored `Data.xml` entry.
 * GenoPro's unzipper is the old Info-ZIP: no UTF-8 flag, version 1.0,
 * and the archive is only the XML. Picture bytes do not belong in a `.gno`.
 */
export const writeDataXmlZip = async (
	xml: Uint8Array,
	sink: GedzipChunkSink
): Promise<void> => {
	const name = new TextEncoder().encode("Data.xml");
	const crc = crc32(xml);
	const local = new Uint8Array(30 + name.length);
	const localView = new DataView(local.buffer);
	localView.setUint32(0, 0x04034b50, true);
	localView.setUint16(4, 10, true);
	localView.setUint16(6, 0, true);
	localView.setUint16(8, 0, true);
	localView.setUint32(14, crc, true);
	localView.setUint32(18, xml.length, true);
	localView.setUint32(22, xml.length, true);
	localView.setUint16(26, name.length, true);
	local.set(name, 30);

	const central = new Uint8Array(46 + name.length);
	const centralView = new DataView(central.buffer);
	centralView.setUint32(0, 0x02014b50, true);
	centralView.setUint16(4, 10, true);
	centralView.setUint16(6, 10, true);
	centralView.setUint16(8, 0, true);
	centralView.setUint32(16, crc, true);
	centralView.setUint32(20, xml.length, true);
	centralView.setUint32(24, xml.length, true);
	centralView.setUint16(28, name.length, true);
	centralView.setUint32(42, 0, true);
	central.set(name, 46);

	await sink.write(local);
	await sink.write(xml);
	await sink.write(central);
	await sink.write(
		endOfCentralDirectory(1, central.length, local.length + xml.length)
	);
};
