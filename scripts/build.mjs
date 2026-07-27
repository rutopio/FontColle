// `vite build` never exits: @cloudflare/vite-plugin spins up a miniflare
// preview server whose bindings keep the event loop alive after the build
// resolves. Every artifact is written by then, so force the exit. Do NOT
// revert this to a plain `vite build`.
process.env.NODE_ENV ??= "production";

// The data assets live in R2, not git (see docs/data-pipeline.md), so a fresh
// clone — notably Cloudflare Workers Builds, which clones on every push — must
// pull them first.
//
// A fork without R2 credentials can't. The sync failing then falls back to the
// committed 24-record sample, so the build still produces a working catalog.
import { copyFileSync, existsSync } from "node:fs";

const url = (p) => new URL(p, import.meta.url);
const assetPaths = [
  "../src/data/fonts.json",
  "../public/glyphs",
  "../public/og",
];
if (assetPaths.some((p) => !existsSync(url(p)))) {
  try {
    await import("./sync-assets.mjs");
  } catch (err) {
    if (existsSync(url("../src/data/fonts.json"))) throw err;
    console.warn(
      `[build] R2 sync failed (${err?.message ?? err}); falling back to the ` +
        "sample catalog (src/data/fonts.sample.json). Run a harvest for the " +
        "full dataset — see the README."
    );
    copyFileSync(
      url("../src/data/fonts.sample.json"),
      url("../src/data/fonts.json")
    );
  }
}

// Before the build, so the static file is picked up as an asset.
const { genSitemap } = await import("./gen-sitemap.mjs");
await genSitemap();

// Before the build, so the client fetches a static CDN asset rather than the
// Worker rebuilding this per request (Error 1102).
const { genCatalog } = await import("./gen-catalog.mjs");
await genCatalog();

// From the slim catalog genCatalog just wrote.
const { genFacets } = await import("./gen-facets.mjs");
await genFacets();

const { createBuilder } = await import("vite");

const builder = await createBuilder();
await builder.buildApp();
process.exit(0);
