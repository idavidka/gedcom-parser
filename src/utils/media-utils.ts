/**
 * Get file extension from filename
 * @param filename - The filename to extract extension from
 * @returns File extension without the dot, or empty string if no extension
 */
export const getFileExtension = (filename: string): string => {
	const match = filename.match(/\.([^.]+)$/);
	return match ? match[1] : "";
};

/**
 * Check if a file format is an image format
 * @param format - The file format/extension to check
 * @returns true if the format is a supported image format
 */
export const isImageFormat = (format: string): boolean => {
	if (!format) return false;
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
	return imageFormats.includes(format.toLowerCase());
};
