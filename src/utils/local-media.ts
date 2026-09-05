/**
 * Optional resolver for local GEDZIP / relative FILE paths (e.g. `media/foo.jpg`).
 * The visualiser injects IndexedDB lookup; the parser stays browser-agnostic.
 */

export type LocalMediaResolver = (
	path: string
) => Promise<string | undefined> | string | undefined;

let localMediaResolver: LocalMediaResolver | undefined;

export const setLocalMediaResolver = (resolver?: LocalMediaResolver) => {
	localMediaResolver = resolver;
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
