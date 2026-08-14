import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fontSpacing } from "../src/lib/fonts/filter/spacing.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

const project = (f) => ({
  id: f.id,
  name: f.name,
  designer: f.designer ?? null,
  category: f.category,
  license: f.license,
  isVariable: f.isVariable,
  isMonospace: f.isMonospace,
  // The reliable spacing signal; isMonospace above is the raw isFixedPitch bit
  // and disagrees with it in both directions.
  spacing: fontSpacing(f),
  weights: f.weights,
  axes: f.axes,
  features: f.features,
  subsets: f.subsets,
  scripts: f.scripts,
  colorTables: f.colorTables,
  contrast: f.contrast,
  popularityRank: f.popularityRank,
  tags: f.tags ?? {},
});

const SKIP_SUBSETS = new Set(["menu", "latin", "latin-ext"]);
const MIN_SUBSET_COUNT = 5;

export async function genFacets() {
  const slim = JSON.parse(
    await readFile(path.join(ROOT, "public/catalog-slim.json"), "utf8")
  );

  const outDir = path.join(ROOT, "public/catalog/facets");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const index = [];

  const writeSlice = async (dimension, value, records) => {
    const safe = String(value)
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    const rel = `catalog/facets/${dimension}/${safe}.json`;
    const abs = path.join(ROOT, "public", rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, JSON.stringify(records.map(project)), "utf8");
    index.push({
      dimension,
      value: String(value),
      count: records.length,
      href: `/${rel}`,
    });
  };

  const push = (map, key, f) => {
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(f);
  };

  const byCategory = new Map();
  for (const f of slim) {
    if (f.category) push(byCategory, f.category, f);
  }
  for (const [value, records] of byCategory) {
    await writeSlice("category", value, records);
  }

  const bySubset = new Map();
  for (const f of slim) {
    for (const s of f.subsets ?? []) {
      if (!SKIP_SUBSETS.has(s)) push(bySubset, s, f);
    }
  }
  for (const [value, records] of bySubset) {
    if (records.length < MIN_SUBSET_COUNT) continue;
    await writeSlice("subset", value, records);
  }

  await writeSlice(
    "flag",
    "variable",
    slim.filter((f) => f.isVariable)
  );
  // fontSpacing(), not the `isMonospace` field: post.isFixedPitch is wrong in
  // both directions (it misses Azeret Mono and Sono, and claims Press Start 2P
  // and Noto Color Emoji), so a slice built from it does not match what the
  // site's own Spacing filter returns.
  await writeSlice(
    "flag",
    "monospace",
    slim.filter((f) => fontSpacing(f) === "mono")
  );
  await writeSlice(
    "flag",
    "color",
    slim.filter((f) => (f.colorTables ?? []).length > 0)
  );

  index.sort(
    (a, b) => a.dimension.localeCompare(b.dimension) || b.count - a.count
  );

  const indexDoc = {
    description:
      "Pre-sharded facet slices of the FontFridge catalog. Fetch one slice " +
      "instead of the 2 MB slim catalog when you can only read data into " +
      "context. Each slice is an array of projected family records; fetch " +
      "/catalog/{id}.json for a family's full record. Combine dimensions by " +
      "intersecting slices on `id`. The `category` dimension is letterform " +
      "only, so a monospaced family sits under its letterform (Roboto Mono " +
      "is Sans); use the flag/monospace slice or each record's `spacing` " +
      "field for advance width, not the raw `isMonospace` bit.",
    generated: new Date().toISOString().slice(0, 10),
    total: slim.length,
    slices: index,
  };
  await writeFile(
    path.join(outDir, "index.json"),
    JSON.stringify(indexDoc, null, 2),
    "utf8"
  );

  const totalBytes = index.reduce((n, s) => n + s.count, 0);
  console.log(
    `[facets] wrote ${index.length} slices (index.json + ${index.length} files, ~${totalBytes} projected records)`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await genFacets();
}
