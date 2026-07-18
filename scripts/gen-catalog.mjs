// Generates public/catalog.json from the font catalog at build time.
//
// The home page is a client-side filter tool over the whole published catalog.
// Building that catalog inside the Worker on every visit (six full-table D1
// reads + JS groupBy → ~14 MB in memory, then serialized into the SSR HTML)
// exceeds the Worker's per-request CPU/memory limit and returns Error 1102.
//
// Since src/data/fonts.json already holds every FontRecord field the list and
// filters need (including languages/scripts/facets), we emit a static,
// CDN-cacheable JSON here and let the browser fetch it directly. The Worker no
// longer touches the catalog; it only serves per-family detail pages.
//
// Only published families are included (the list hides the rest), sorted by
// name to match the previous loadAllFonts() ordering so the client can render
// without re-sorting.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

export async function genCatalog() {
  const raw = await readFile(path.join(ROOT, "src/data/fonts.json"), "utf8");
  const data = JSON.parse(raw);
  const all = Array.isArray(data) ? data : (data.fonts ?? []);

  const fonts = all
    .filter((f) => f?.isPublished ?? true)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Minified (no whitespace) to keep the transfer small; the browser parses it.
  const json = JSON.stringify(fonts);
  await writeFile(path.join(ROOT, "public/catalog.json"), json, "utf8");

  console.log(
    `[catalog] wrote ${fonts.length} published families to public/catalog.json (${(json.length / 1024 / 1024).toFixed(1)} MB)`
  );
}

// Allow running standalone: `node scripts/gen-catalog.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  await genCatalog();
}
