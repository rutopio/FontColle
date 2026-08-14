import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");

export async function genCatalog() {
  const raw = await readFile(path.join(ROOT, "src/data/fonts.json"), "utf8");
  const data = JSON.parse(raw);
  const all = Array.isArray(data) ? data : (data.fonts ?? []);

  const fonts = all
    .filter((f) => f?.isPublished ?? true)
    .sort((a, b) => a.name.localeCompare(b.name));

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
  await writeFile(path.join(ROOT, "public/catalog.json"), catalog, "utf8");
  console.log(
    `[catalog] wrote ${fonts.length} published families to public/catalog.json (${(catalog.length / 1024 / 1024).toFixed(1)} MB)`
  );

  const hash = createHash("sha256").update(catalog).digest("hex").slice(0, 16);
  const hashedRel = `/catalog-v/${hash}.json`;
  const hashedDir = path.join(ROOT, "public/catalog-v");
  await rm(hashedDir, { recursive: true, force: true });
  await mkdir(hashedDir, { recursive: true });
  await writeFile(path.join(ROOT, `public${hashedRel}`), catalog, "utf8");
  await writeFile(
    path.join(ROOT, "public/catalog-manifest.json"),
    JSON.stringify({ path: hashedRel }),
    "utf8"
  );
  console.log(`[catalog] wrote hashed catalog + manifest -> ${hashedRel}`);

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

  const slim = fonts.map((f) => ({
    id: f.id,
    name: f.name,
    designer: f.designer ?? null,
    category: f.category,
    // Backs fontSpacing() for the families the google/fonts tags CSV has not
    // reached (Hibur Mono, Iosevka Charon).
    apiCategory: f.apiCategory,
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

  // Must match sortFonts(fonts, "popularity") in src/lib/fonts/sort.ts.
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await genCatalog();
}
