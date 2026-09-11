export const parentRelationsFr: Record<string, string> = {
	step: "step",
	foster: "foster",
	adopted: "adopted",
};

export const InLawsFr: Record<string, string> = {
	"conjoint de (enfant|fille|fils)": "beau-fils/belle-fille",
	"épouse de (enfant|fille|fils)": "belle-fille",
	"mari de (enfant|fille|fils)": "gendre",
	"mère (du mari|du conjoint|de l'épouse)": "belle-mère",
	"père (du mari|du conjoint|de l'épouse)": "beau-père",
	"parent (du mari|du conjoint|de l'épouse)": "beau-parent",
	"épouse de (demi-)?(frère/sœur|sœur|frère)": "belle-sœur",
	"mari de (demi-)?(frère/sœur|sœur|frère)": "beau-frère",
	"conjoint de (demi-)?(frère/sœur|sœur|frère)": "beau-frère/belle-sœur",
	"(demi-)?sœur (du mari|du conjoint|de l'épouse)": "belle-sœur",
	"(demi-)?frère (du mari|du conjoint|de l'épouse)": "beau-frère",
	"(demi-)?frère/sœur (du mari|du conjoint|de l'épouse)":
		"beau-frère/belle-sœur",
};
