export const getRawSize = (raw?: string) => {
	return `${raw || ""}`?.length ?? 0;
};
