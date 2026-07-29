// @cloudflare/vite-plugin keeps the event loop alive after build; force exit.
process.env.NODE_ENV ??= "production";

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

const { genSitemap } = await import("./gen-sitemap.mjs");
await genSitemap();

const { genCatalog } = await import("./gen-catalog.mjs");
await genCatalog();

const { genFacets } = await import("./gen-facets.mjs");
await genFacets();

const { createBuilder } = await import("vite");

const builder = await createBuilder();
await builder.buildApp();
process.exit(0);
