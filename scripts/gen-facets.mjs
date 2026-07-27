// Pre-sharded slices, so an agent that can only read data into context (rather
// than fetch and filter) pulls one small slice instead of the 2 MB slim catalog
// (~580k tokens). Runs after gen-catalog.mjs, reading what it just wrote.
//
// The sharding dimensions are deliberately limited to ones that cut the result
// set without combinatorially exploding. Anything finer is left to the agent to
// rank after fetching a slice.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);

// Identity plus what you still rank on after narrowing. The metric detail
// fields are only read once a family is chosen: fetch /catalog/{id}.json.
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

if (import.meta.url === `file://${process.argv[1]}`) {
  await genFacets();
}
