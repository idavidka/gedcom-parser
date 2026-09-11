export const parentRelationsEs: Record<string, Record<string, string>> = {
	step: {
		padre: "padrastro",
		madre: "madrastra",
		hijo: "hijastro",
		hija: "hijastra",
		hermano: "hermanastro",
		hermana: "hermanastra",
		abuelo: "abuelastro",
		abuela: "abuelastra",
	},
};

export const InLawsEs: Record<string, string> = {
	"cónyuge de (hijo/hija|hija|hijo)": "yerno/nuera",
	"esposa de (hijo/hija|hija|hijo)": "nuera",
	"esposo de (hijo/hija|hija|hijo)": "yerno",
	"madre (del cónyuge|del esposo|de la esposa)": "suegra",
	"padre (del cónyuge|del esposo|de la esposa)": "suegro",
	"padre/madre (del cónyuge|del esposo|de la esposa)": "suegro/suegra",
	"esposa de (medio |media |medio/a )?(hermano/hermana|hermana|hermano)":
		"cuñada",
	"esposo de (medio |media |medio/a )?(hermano/hermana|hermana|hermano)":
		"cuñado",
	"cónyuge de (medio |media |medio/a )?(hermano/hermana|hermana|hermano)":
		"cuñado/cuñada",
	"(medio |media |medio/a )?hermana (del cónyuge|del esposo|de la esposa)":
		"cuñada",
	"(medio |media |medio/a )?hermano (del cónyuge|del esposo|de la esposa)":
		"cuñado",
	"(medio |media |medio/a )?hermano/hermana (del cónyuge|del esposo|de la esposa)":
		"cuñado/cuñada",
};
