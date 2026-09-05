/**
 * Optional resolvers for local / cached media (GEDZIP paths, IndexedDB, etc.).
 * The visualiser injects storage lookups; the parser stays host-agnostic.
 */

export type LocalMediaResolver = (
	path: string
) => Promise<string | undefined> | string | undefined;

export type MediaContentLookup = {
	url?: string;
	id?: string;
	imgId?: string;
	key?: string;
	contentType?: string;
};

export type MediaContentResult = {
	content: string;
	contentType?: string;
};

export type MediaContentResolver = (
	media: MediaContentLookup
) =>
	| Promise<MediaContentResult | undefined>
	| MediaContentResult
	| undefined;

let localMediaResolver: LocalMediaResolver | undefined;
let mediaContentResolver: MediaContentResolver | undefined;

export const setLocalMediaResolver = (resolver?: LocalMediaResolver) => {
	localMediaResolver = resolver;
};

export const setMediaContentResolver = (resolver?: MediaContentResolver) => {
	mediaContentResolver = resolver;
};

export const isRemoteOrEmbeddedMediaUrl = (path?: string) => {
	if (!path) {
		return false;
	}
	return (
		path.startsWith("data:") ||
		path.startsWith("blob:") ||
		/^https?:\/\//i.test(path)
	);
};

/**
 * Resolve a FILE payload to a browser-displayable URL when possible.
 * Leaves http(s)/data/blob URLs unchanged; asks the injected resolver for local paths.
 */
export const resolveLocalMediaUrl = async (path?: string) => {
	if (!path) {
		return undefined;
	}
	if (isRemoteOrEmbeddedMediaUrl(path)) {
		return path;
	}
	const resolved = await localMediaResolver?.(path);
	// Do not fall back to the raw path — `media/foo.jpg` is not browser-usable.
	return resolved;
};

const blobToDataUrl = async (blob: Blob) => {
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	const mime = blob.type || "application/octet-stream";
	if (typeof Buffer !== "undefined") {
		return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
	}
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return `data:${mime};base64,${btoa(binary)}`;
};

/**
 * Resolve media bytes for GEDZIP export: host cache → local path → data URL → fetch.
 */
export const resolveMediaContent = async (
	media: MediaContentLookup
): Promise<MediaContentResult | undefined> => {
	const fromHost = await mediaContentResolver?.(media);
	if (fromHost?.content) {
		return fromHost;
	}

	const url = media.url;
	if (!url) {
		return undefined;
	}

	if (url.startsWith("data:") || url.startsWith("blob:")) {
		return { content: url, contentType: media.contentType };
	}

	if (!isRemoteOrEmbeddedMediaUrl(url)) {
		const local = await resolveLocalMediaUrl(url);
		if (local && isRemoteOrEmbeddedMediaUrl(local)) {
			return { content: local, contentType: media.contentType };
		}
		return undefined;
	}

	if (typeof fetch !== "function") {
		return undefined;
	}

	try {
		const response = await fetch(url);
		if (!response.ok) {
			return undefined;
		}
		const blob = await response.blob();
		const content = await blobToDataUrl(blob);
		const contentType =
			media.contentType || blob.type.split("/").pop() || "bin";
		return { content, contentType };
	} catch {
		return undefined;
	}
};
