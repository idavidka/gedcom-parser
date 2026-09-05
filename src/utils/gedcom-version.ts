export const GEDCOM_EXPORT_VERSIONS = ["5.5.1", "7.0"] as const;

export type GedcomExportVersion = (typeof GEDCOM_EXPORT_VERSIONS)[number];

export const DEFAULT_GEDCOM_EXPORT_VERSION: GedcomExportVersion = "5.5.1";

export const normalizeGedcomVersion = (
	value?: string | null
): GedcomExportVersion => {
	const trimmed = value?.trim() ?? "";
	if (trimmed.startsWith("7")) {
		return "7.0";
	}
	return "5.5.1";
};

export const isGedcom7 = (value?: string | null) =>
	normalizeGedcomVersion(value) === "7.0";
