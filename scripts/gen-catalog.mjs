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
//   public/catalog-slim.json     - every published family projected to the
//                                   query-relevant fields (~2 MB vs the full
//                                   13 MB), for LLM agents. Documented in
//                                   public/llms.txt, unused by the app itself.
//   public/catalog-first.json    - the first ~24 full FontRecords in the home
//                                   page's DEFAULT sort order (popularity). The
//                                   index loader returns just this slice so the
//                                   SSR HTML of a default `/` visit ships real
//                                   font cards + /specimen/ links for crawlers,
//                                   while the full catalog still loads client-side
//                                   (never in the Worker, Error 1102).
//
// This replaces D1: the app used to read the catalog from a database that was
// itself just a copy of fonts.json, and rebuilding the whole catalog in the
// Worker per request exceeded its limits (Error 1102). The data is read-only,
// site-wide, and refreshed once a day, so static CDN-cached JSON fits it better
// than a database: no Worker round-trip, no seeding, no migrations.
//
// catalog.json is sorted by name to match the old loadAllFonts() ordering so the
// client renders without re-sorting.

import { createHash } from "node:crypto";
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
  // Plain path stays for backward-compat + fallback (see catalog.ts).
  await writeFile(path.join(ROOT, "public/catalog.json"), catalog, "utf8");
  console.log(
    `[catalog] wrote ${fonts.length} published families to public/catalog.json (${(catalog.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // Cache-busting: also write the catalog to a content-hashed, immutable path
  // and point a tiny manifest at it. The client fetches the manifest (short
  // TTL) then the hashed file (year-long immutable in public/_headers), so a
  // redeploy that changes the data ships a new hash and busts the CDN cache
  // without waiting out a TTL. The hash is a short sha256 of the JSON bytes, so
  // identical content re-emits the same filename (idempotent rebuilds).
  const hash = createHash("sha256").update(catalog).digest("hex").slice(0, 16);
  const hashedRel = `/catalog-v/${hash}.json`;
  const hashedDir = path.join(ROOT, "public/catalog-v");
  // Rebuild from scratch so stale hashed files from previous builds are dropped.
  await rm(hashedDir, { recursive: true, force: true });
  await mkdir(hashedDir, { recursive: true });
  await writeFile(path.join(ROOT, `public${hashedRel}`), catalog, "utf8");
  await writeFile(
    path.join(ROOT, "public/catalog-manifest.json"),
    JSON.stringify({ path: hashedRel }),
    "utf8"
  );
  console.log(`[catalog] wrote hashed catalog + manifest -> ${hashedRel}`);

  // Per-font files for the detail page. Rebuild this dir from scratch so
  // families that became unpublished don't leave a stale file behind. It holds
  // nothing but generated files, so wiping it is safe.
  const perFontDir = path.join(ROOT, "public/catalog");
  await rm(perFontDir, { recursive: true, force: true });
  await mkdir(perFontDir, { recursive: true });
  await Promise.all(
    fonts.map((f) =>
      writeFile(
        path.join(perFontDir, `${f.id}.json`),
        JSON.stringify(f),
        "utf8"
      )
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

  // Slim catalog for LLM / agent consumption (documented in public/llms.txt).
  // The full catalog is ~13 MB, past any model's context window, so an agent
  // asked "find me a playful variable sans" can only use it by downloading and
  // scripting over it. This projection keeps every field a semantic query
  // filters or ranks on and drops the bulk: `languages` (~9 KB per record, the
  // single fattest field), `instances`, `about`, `versionHistory`,
  // `designerProfiles`, `specimen`, `licenseHeader`, and the raw vertical
  // metrics that `metrics.ts` only reads to derive ratios from.
  //
  // `axes` flattens to its tags: an agent filtering "has a wght axis" needs the
  // tag, not each axis's min/max/default. Full per-axis ranges stay in
  // catalog.json and the per-font files.
  //
  // `tags` (Google Fonts classification scores, 0-100) is kept in full rather
  // than thresholded at the UI's >= 50: the scores are what make ranking by
  // "how playful" possible, and keeping them costs only ~0.2 MB.
  const slim = fonts.map((f) => ({
    id: f.id,
    name: f.name,
    designer: f.designer ?? null,
    class: f.class,
    license: f.license,
    isVariable: f.isVariable,
    isMonospace: f.isMonospace,
    isNoto: f.isNoto,
    weights: f.weights,
    widthClass: f.widthClass,
    unitsPerEm: f.unitsPerEm,
    axes: (f.axes ?? []).map((a) => a.tag),
    features: f.features,
    facets: f.facets,
    subsets: f.subsets,
    scripts: f.scripts,
    colorTables: f.colorTables,
    glyphCount: f.glyphCount,
    fileSize: f.fileSize,
    contrast: f.contrast,
    xHeight: f.xHeight,
    capHeight: f.capHeight,
    avgCharWidth: f.avgCharWidth,
    popularityRank: f.popularityRank,
    trendingRank: f.trendingRank,
    dateAdded: f.dateAdded,
    repositoryUrl: f.repositoryUrl,
    vendorId: f.vendorId,
    tags: f.tags ?? {},
  }));
  const slimJson = JSON.stringify(slim);
  await writeFile(
    path.join(ROOT, "public/catalog-slim.json"),
    slimJson,
    "utf8"
  );
  console.log(
    `[catalog] wrote catalog-slim.json (${slim.length} records, ${(slimJson.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // First-page SSR slice: the first FIRST_PAGE_SIZE full FontRecords in the home
  // page's DEFAULT sort (popularity), replicated here in plain JS so the index
  // loader can return this tiny slice (a few tens of KB) without the Worker ever
  // touching the 14 MB catalog. Keep this ordering in lockstep with
  // sortFonts(fonts, "popularity") in src/lib/fonts/sort.ts: lower
  // popularityRank first, null ranks last, ties broken by name (base sensitivity).
  const FIRST_PAGE_SIZE = 24;
  const byNameBase = (a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const byPopularity = (a, b) => {
    const ar = a.popularityRank;
    const br = b.popularityRank;
    if (ar == null && br == null) return byNameBase(a, b);
    if (ar == null) return 1;
    if (br == null) return -1;
    return ar - br || byNameBase(a, b);
  };
  const firstPage = [...fonts]
    .sort(byPopularity)
    .slice(0, FIRST_PAGE_SIZE)
    // Drop the per-font `languages` list (the single fattest field, ~9 KB each,
    // ~1/3 of the slice). Nothing in the card render path or facet derivation
    // reads it, it feeds only the filter sidebar's language section, which the
    // first-page pending state renders empty. Blanked (not omitted) so records
    // still satisfy FontRecord. This keeps the loader's payload a few tens of KB,
    // honouring the Error 1102 constraint, while every field the cards touch
    // stays intact.
    .map((f) => ({ ...f, languages: [] }));
  const firstJson = JSON.stringify(firstPage);
  await writeFile(
    path.join(ROOT, "public/catalog-first.json"),
    firstJson,
    "utf8"
  );
  console.log(
    `[catalog] wrote catalog-first.json (${firstPage.length} records, ${(firstJson.length / 1024).toFixed(0)} KB)`
  );
}

// Allow running standalone: `node scripts/gen-catalog.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  await genCatalog();
}
