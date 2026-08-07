import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");
const GLYPH_DIR = path.join(ROOT, "public/glyphs");
const OUT = path.join(ROOT, "public/glyph-index.json");

// Base36 delta encoding per range: "<gap>.<len>"; single-codepoint ranges omit ".0".
function encodeRanges(ranges) {
  let prev = 0;
  const parts = [];
  for (const [start, end] of ranges) {
    const gap = (start - prev).toString(36);
    const len = end - start;
    parts.push(len === 0 ? gap : `${gap}.${len.toString(36)}`);
    prev = end;
  }
  return parts.join(",");
}

// Adobe Blank matches every coverage query; exclude it even if catalog marks it published.
const EXCLUDED_IDS = new Set(["adobeblank"]);

export async function genGlyphIndex() {
  let files = [];
  try {
    files = (await readdir(GLYPH_DIR)).filter((f) => f.endsWith(".json"));
  } catch {}

  const classIndex = new Map();
  const classes = [];
  const fonts = {};

  for (const file of files.sort()) {
    const id = file.slice(0, -".json".length);
    if (EXCLUDED_IDS.has(id)) continue;
    let ranges;
    try {
      ranges = JSON.parse(
        await readFile(path.join(GLYPH_DIR, file), "utf8")
      )?.ranges;
    } catch {
      continue;
    }
    if (!Array.isArray(ranges) || ranges.length === 0) continue;
    const encoded = encodeRanges(ranges);
    let idx = classIndex.get(encoded);
    if (idx === undefined) {
      idx = classes.length;
      classes.push(encoded);
      classIndex.set(encoded, idx);
    }
    fonts[id] = idx;
  }

  const json = JSON.stringify({ classes, fonts });
  await writeFile(OUT, json, "utf8");
  console.log(
    `[glyph-index] wrote ${Object.keys(fonts).length} fonts / ${classes.length} coverage classes to public/glyph-index.json (${(json.length / 1024 / 1024).toFixed(2)} MB)`
  );
}

// pathToFileURL, not `file://${argv[1]}`: this repo's path contains brackets,
// which import.meta.url percent-encodes and a raw concatenation does not.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await genGlyphIndex();
}
