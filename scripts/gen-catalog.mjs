// Generates the static font data the site serves at build time, from the
// authoritative src/data/fonts.json:
//
//   public/catalog.json          - every published FontRecord (home page fetches
//                                   this and filters client-side).
//   public/catalog/<id>.json     - one FontRecord per published family (the
//                                   detail page's SSR loader fetches just the one
//                                   it needs, so it never loads the whole catalog).
//                                   Kept out of public/fonts/, which holds the
//                                   site's own UI webfonts.
//   public/designer-index.json   - {id, name, designer}[] for published families
//                                   (the detail page's Designer tab buckets these
//                                   by designer name, client-side).
//
// This replaces D1: the app used to read the catalog from a database that was
// itself just a copy of fonts.json, and rebuilding the whole catalog in the
// Worker per request exceeded its limits (Error 1102). The data is read-only,
// site-wide, and refreshed once a day, so static CDN-cached JSON fits it better
// than a database — no Worker round-trip, no seeding, no migrations.
//
// catalog.json is sorted by name to match the old loadAllFonts() ordering so the
// client renders without re-sorting.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  const catalog = JSON.stringify(fonts);
  await writeFile(path.join(ROOT, "public/catalog.json"), catalog, "utf8");
  console.log(
    `[catalog] wrote ${fonts.length} published families to public/catalog.json (${(catalog.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // Per-font files for the detail page. Rebuild this dir from scratch so
  // families that became unpublished don't leave a stale file behind. It holds
  // nothing but generated files, so wiping it is safe.
  const perFontDir = path.join(ROOT, "public/catalog");
  await rm(perFontDir, { recursive: true, force: true });
  await mkdir(perFontDir, { recursive: true });
  await Promise.all(
    fonts.map((f) =>
      writeFile(path.join(perFontDir, `${f.id}.json`), JSON.stringify(f), "utf8")
    )
  );
  console.log(
    `[catalog] wrote ${fonts.length} per-font files to public/catalog/`
  );

  // Designer index: just what the Designer tab needs to link siblings.
  const designerIndex = fonts.map((f) => ({
    id: f.id,
    name: f.name,
    designer: f.designer ?? null,
  }));
  const indexJson = JSON.stringify(designerIndex);
  await writeFile(
    path.join(ROOT, "public/designer-index.json"),
    indexJson,
    "utf8"
  );
  console.log(
    `[catalog] wrote designer-index.json (${(indexJson.length / 1024).toFixed(0)} KB)`
  );
}

// Allow running standalone: `node scripts/gen-catalog.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  await genCatalog();
}
