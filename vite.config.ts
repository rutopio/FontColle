import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BUILD_ID = Date.now().toString(36);

const config = defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
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
