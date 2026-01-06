// @ts-nocheck
import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { existsSync } from "fs";

// Check if we're running in standalone mode or as part of monorepo
const isStandalone = !existsSync(resolve(process.cwd(), "../nx.json"));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
  resolve: {
    alias: isStandalone
      ? {}
      : {
          // Add any aliases needed when running in monorepo mode
        },
  },
});
