export type Language = "en" | "hu" | "de" | "es" | "fr" | "ru" | "ja" | "zh";

export interface Cases {
	nominativus: string;
	dativus: string;
	possessivus: string;
}

export type CrossCase = Record<string, Cases>;

export type CrossCases = Record<keyof Cases, CrossCase>;
