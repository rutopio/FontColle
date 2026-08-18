import { readFileSync } from "node:fs";
import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const BUILD_ID = Date.now().toString(36);

// Data hash for SSR cache key; falls back to BUILD_ID when absent.
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

const PUBLIC_PRELOAD_FONTS: { path: string; type: string }[] = [
  { path: "/fonts/albert-sans.woff2", type: "font/woff2" },
  { path: "/fonts/host-grotesk.woff2", type: "font/woff2" },
  { path: "/fonts/paper-mono.woff2", type: "font/woff2" },
];

function fontPreloadPlugin(): Plugin {
  return {
    name: "font-preload",
    transformIndexHtml() {
      return PUBLIC_PRELOAD_FONTS.map(({ path, type }) => ({
        tag: "link",
        attrs: {
          rel: "preload",
          href: path,
          as: "font",
          type,
          crossorigin: "",
        },
        injectTo: "head" as const,
      }));
    },
  };
}

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
    fontPreloadPlugin(),
  ],
});

export default config;
