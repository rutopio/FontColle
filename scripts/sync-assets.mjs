import { mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT, r2Get, r2GetManifest, sha256File } from "./lib/r2.mjs";
import { extractTar } from "./lib/tar.mjs";

function verify(file, expected, label) {
  const got = sha256File(file);
  if (got !== expected) {
    throw new Error(
      `${label} sha256 mismatch: manifest ${expected} got ${got}`
    );
  }
}

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

const manifest = r2GetManifest();
mkdirSync(SCRATCH, { recursive: true });

r2Get(manifest.fonts.key, FONTS_JSON);
verify(FONTS_JSON, manifest.fonts.sha256, "fonts.json");
console.log(`[sync] fonts.json <- ${manifest.fonts.key} (verified)`);

{
  const tar = path.join(SCRATCH, "glyphs.tar.gz");
  r2Get(manifest.glyphs.key, tar);
  verify(tar, manifest.glyphs.sha256, "glyphs.tar.gz");
  extractTar(tar, GLYPHS_DIR);
  console.log(
    `[sync] public/glyphs <- ${manifest.glyphs.key} (${manifest.glyphs.count} files, verified)`
  );
}

{
  const tar = path.join(SCRATCH, "og.tar.gz");
  r2Get(manifest.og.base.key, tar);
  verify(tar, manifest.og.base.sha256, "og.tar.gz");
  extractTar(tar, OG_DIR);
  console.log(`[sync] public/og <- ${manifest.og.base.key} (verified)`);
  const deltas = manifest.og.deltas ?? [];
  for (const key of deltas) {
    const name = key.slice("og/".length);
    r2Get(key, path.join(OG_DIR, name));
  }
  if (deltas.length) console.log(`[sync] applied ${deltas.length} OG deltas`);
}

console.log("[sync] done");
