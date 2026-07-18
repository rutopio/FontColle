// Standalone Vitest config so unit tests run under plain Node without the app's
// Cloudflare/TanStack Vite plugins (the Cloudflare plugin rejects Vitest's SSR
// environment options and refuses to boot). Tests here cover pure library logic
// in src/lib/**, so no DOM or app plugins are needed — just the "@" alias that
// mirrors tsconfig's paths.
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
