// Emit pre-sharded facet slices of the catalog under public/catalog/facets/ so
// an agent that can only read data into its context (rather than fetch+filter)
// can pull one small slice instead of the 2 MB slim catalog (~580k tokens).
//
// Runs after gen-catalog.mjs in build.mjs, reading the catalog-slim.json it just
// wrote. All output is static assets copied into dist/client by the vite build.
//
// Sharding dimensions are deliberately limited to the ones that (a) meaningfully
// cut the result set and (b) don't combinatorially explode:
//   - category         (8 values: Sans, Serif, Display, Script, Slab, Mono, ...)
//   - non-Latin subset (writing-system support; Latin is ~everything, skipped)
//   - flags            (variable, monospace, color) — small, high-value slices
// A facets/index.json lists every slice with its count and href so the agent
// picks one without guessing. Anything finer (tag combos, category x subset) is
// left to the agent to rank after fetching a slice or the slim catalog.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);

// Per-record projection inside a slice: identity + the fields you still filter
// or rank on after narrowing (tags drives mood ranking). Drops the metric detail
// fields (xHeight, capHeight, unitsPerEm, glyphCount, fileSize, ...) that you
// only read once a family is chosen — fetch /catalog/{id}.json for those.
const project = (f) => ({
  id: f.id,
  name: f.name,
  designer: f.designer ?? null,
  category: f.category,
  license: f.license,
  isVariable: f.isVariable,
  isMonospace: f.isMonospace,
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

// Latin is carried by nearly every family, so a "latin" slice ~= the whole
// catalog and is not worth emitting. Skip it and its ext variant.
const SKIP_SUBSETS = new Set(["menu", "latin", "latin-ext"]);
// Only emit a subset slice once it's small enough to be worth fetching over the
// slim catalog and populated enough to be useful.
const MIN_SUBSET_COUNT = 5;

export async function genFacets() {
  const slim = JSON.parse(
    await readFile(path.join(ROOT, "public/catalog-slim.json"), "utf8")
  );

  const outDir = path.join(ROOT, "public/catalog/facets");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  /** @type {{dimension:string,value:string,count:number,href:string}[]} */
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

  // category
  const byCategory = new Map();
  for (const f of slim) {
    if (f.category) push(byCategory, f.category, f);
  }
  for (const [value, records] of byCategory) {
    await writeSlice("category", value, records);
  }

  // non-Latin subsets
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

  // flags
  await writeSlice(
    "flag",
    "variable",
    slim.filter((f) => f.isVariable)
  );
  await writeSlice(
    "flag",
    "monospace",
    slim.filter((f) => f.isMonospace)
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
      "Pre-sharded facet slices of the FontColle catalog. Fetch one slice " +
      "instead of the 2 MB slim catalog when you can only read data into " +
      "context. Each slice is an array of projected family records; fetch " +
      "/catalog/{id}.json for a family's full record. Combine dimensions by " +
      "intersecting slices on `id`.",
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

// Allow running standalone: `node scripts/gen-facets.mjs`.
if (import.meta.url === `file://${process.argv[1]}`) {
  await genFacets();
}
