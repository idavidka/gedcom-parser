import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		// Main entry
		index: "src/index.ts",

		// Module entry points (matching package.json exports)
		"classes/index": "src/classes/index.ts",
		"factories/index": "src/factories/index.ts",
		"constants/index": "src/constants/index.ts",
		"structures/index": "src/structures/index.ts",
		"kinship-translator/index": "src/kinship-translator/index.ts",
		"interfaces/index": "src/interfaces/index.ts",
		"types/index": "src/types/index.ts",
		"utils/index": "src/utils/index.ts",

		// CLI entry (no DTS needed for CLI)
		"cli/index": "src/cli/index.ts",
	},
	format: ["esm"],
	// Disable tsup's DTS generation - we'll use TypeScript compiler directly
	dts: false,
	clean: true,
	sourcemap: false, // Source maps not needed for npm packages
	splitting: false,
	treeshake: true,
	minify: false,
	external: [
		"lodash-es",
		"date-fns",
		"chalk",
		"commander",
	],
});
