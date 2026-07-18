// Production build wrapper.
//
// `vite build` runs the full pipeline (client + SSR + TanStack Start prerender)
// but never exits: the @cloudflare/vite-plugin spins up a miniflare preview
// server whose bindings can leave the event loop alive after the build resolves.
// All artifacts are written by then, so we force a clean exit. (Same reason as
// TypeSpan's build wrapper — do not revert to plain `vite build`.)
process.env.NODE_ENV ??= "production";

// The data assets (src/data/fonts.json, public/glyphs, public/og) live in R2,
// not git (see src/data/data-manifest.json). A build from a fresh clone —
// notably Cloudflare Workers Builds, which clones the repo on every push —
// must pull them first. Local trees that already have the files skip this;
// `pnpm pull:data` refreshes explicitly.
import { existsSync } from "node:fs";
const assetPaths = ["../src/data/fonts.json", "../public/glyphs", "../public/og"];
if (assetPaths.some((p) => !existsSync(new URL(p, import.meta.url)))) {
  await import("./sync-assets.mjs");
}

// Emit public/sitemap.xml (+ robots Sitemap line) before the build so the
// static file is picked up as an asset. No-op when VITE_SITE_URL is unset.
const { genSitemap } = await import("./gen-sitemap.mjs");
await genSitemap();

// Emit public/catalog.json (published families) before the build so the client
// can fetch the catalog as a static CDN asset instead of the Worker rebuilding
// it from D1 on every request (Error 1102). See gen-catalog.mjs.
const { genCatalog } = await import("./gen-catalog.mjs");
await genCatalog();

const { createBuilder } = await import("vite");

const builder = await createBuilder();
await builder.buildApp();
process.exit(0);
