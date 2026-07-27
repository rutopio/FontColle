// Generates the static font data the site serves at build time, from the
// authoritative src/data/fonts.json:
//
//   public/catalog.json          - every published FontRecord minus the
//                                   detail-only fields; the home page fetches
//                                   this and filters client-side.
//   public/catalog/<id>.json     - one COMPLETE FontRecord per family, which is
//                                   why the shared catalog can drop those
//                                   fields. The detail loader fetches just one.
//   public/designer-index.json   - {id, name, designer}[], bucketed by the
//                                   Designer tab client-side.
//   public/catalog-slim.json     - every family projected to the query-relevant
//                                   fields (~2 MB vs 13 MB), for LLM agents.
//                                   Documented in public/llms.txt, unused here.
//   public/catalog-first.json    - the first ~24 full records in the default
//                                   sort, so a default `/` visit's SSR HTML
//                                   ships real cards without the Worker ever
//                                   touching the full catalog (Error 1102).
//
// The data is read-only, site-wide and refreshed daily, so static CDN-cached
// JSON fits it better than a database: no Worker round-trip, no migrations.
//
// catalog.json is sorted by name, so the client renders without re-sorting.

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

  // Fields the list view never reads: the detail page fetches its own complete
  // record and already has them. Shipping them here cost every visitor ~2.4 MB
  // of prose and profiles to render a grid of names. `languages` stays despite
  // being the fattest field: the sidebar's language facet filters on it.
  const DETAIL_ONLY_FIELDS = [
    "designerProfiles",
    "about",
    "licenseHeader",
    "versionHistory",
    "cjkCoverage",
  ];
  const forList = (f) => {
    const out = { ...f };
    for (const k of DETAIL_ONLY_FIELDS) delete out[k];
    return out;
  };

  const catalog = JSON.stringify(fonts.map(forList));
  // Kept as the fallback when the manifest fetch fails (see catalog.ts).
  await writeFile(path.join(ROOT, "public/catalog.json"), catalog, "utf8");
  console.log(
    `[catalog] wrote ${fonts.length} published families to public/catalog.json (${(catalog.length / 1024 / 1024).toFixed(1)} MB)`
  );

  // Cache-busting: a short-TTL manifest points at a content-hashed, immutable
  // copy, so a redeploy that changes the data busts the CDN cache without
  // waiting out a TTL. The hash is of the JSON bytes, so identical content
  // re-emits the same filename and rebuilds stay idempotent.
  const hash = createHash("sha256").update(catalog).digest("hex").slice(0, 16);
  const hashedRel = `/catalog-v/${hash}.json`;
  const hashedDir = path.join(ROOT, "public/catalog-v");
  // From scratch, so stale hashed files from previous builds are dropped.
  await rm(hashedDir, { recursive: true, force: true });
  await mkdir(hashedDir, { recursive: true });
  await writeFile(path.join(ROOT, `public${hashedRel}`), catalog, "utf8");
  await writeFile(
    path.join(ROOT, "public/catalog-manifest.json"),
    JSON.stringify({ path: hashedRel }),
    "utf8"
  );
  console.log(`[catalog] wrote hashed catalog + manifest -> ${hashedRel}`);

  // Rebuilt from scratch so an unpublished family leaves no stale file behind.
  // The dir holds nothing but generated files, so wiping it is safe.
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

  // For LLM agents: the full catalog is ~13 MB, past any model's context
  // window. Keeps every field a semantic query filters or ranks on.
  //
  // `axes` flattens to its tags: filtering "has a wght axis" needs the tag, not
  // each axis's min/max/default, which stay in the full records.
  //
  // `tags` keeps its full 0-100 scores rather than thresholding at the UI's
  // >= 50: the scores are what make ranking by "how playful" possible, and
  // they cost only ~0.2 MB.
  const slim = fonts.map((f) => ({
    id: f.id,
    name: f.name,
    designer: f.designer ?? null,
    category: f.category,
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

  // The default (popularity) sort, replicated here in plain JS so the index
  // loader can return a tiny slice without the Worker touching the full
  // catalog. Keep this in lockstep with sortFonts(fonts, "popularity") in
  // src/lib/fonts/sort.ts.
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
    // Drop `languages`, the fattest field at ~9 KB each and ~1/3 of the slice:
    // nothing in the card render path reads it, and the sidebar section it
    // feeds renders empty in the pending state. Blanked, not omitted, so
    // records still satisfy FontRecord. The detail-only fields go too, and it
    // matters more here: this slice is serialized into every `/` document.
    .map((f) => ({ ...forList(f), languages: [] }));
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

if (import.meta.url === `file://${process.argv[1]}`) {
  await genCatalog();
}
