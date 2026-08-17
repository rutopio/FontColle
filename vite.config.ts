import { readFileSync } from "node:fs";
import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BUILD_ID = Date.now().toString(36);

// Content hash of src/data/fonts.json, written by scripts/gen-catalog.mjs
// earlier in `pnpm build`. Detail pages key their SSR cache on this rather than
// BUILD_ID so a code-only deploy does not invalidate every cached detail
// render. Falls back to BUILD_ID when the file is absent (plain `vite dev`
// without a prior catalog generation), which is only ever more conservative.
const dataVersion = (() => {
  try {
    const raw = readFileSync(
      path.resolve(import.meta.dirname, "./src/data/version.json"),
      "utf8"
    );
    return (
      (JSON.parse(raw) as { dataVersion?: string }).dataVersion ?? BUILD_ID
    );
  } catch {
    return BUILD_ID;
  }
})();

const config = defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __DATA_VERSION__: JSON.stringify(dataVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
