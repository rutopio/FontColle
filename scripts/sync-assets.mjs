// Pulls the data assets that live in R2 (per src/data/data-manifest.json) back
// into place so a build or local dev has them:
//
//   src/data/fonts.json   <- fonts/<seq>.json (the manifest's current version)
//   public/glyphs/*.json  <- glyphs/glyphs.tar.gz (extracted)
//   public/og/*.png       <- og/og.tar.gz (extracted) + og/<id>.png deltas
//
// Runs before `pnpm build` in CI (Deploy step) and via `pnpm pull:data` after a
// fresh clone. Idempotent: it overwrites the local copies from R2 every time.
// Verifies the fonts.json sha256 against the manifest so a truncated download
// fails loudly instead of shipping a corrupt catalog.
//
// No new npm deps: node built-ins + wrangler (via lib/r2.mjs) + system tar.

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { MANIFEST_PATH, ROOT, r2Get, sha256File } from "./lib/r2.mjs";
import { extractTar } from "./lib/tar.mjs";

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
mkdirSync(SCRATCH, { recursive: true });

// fonts.json, pull the manifest's current version and verify its hash.
r2Get(manifest.fonts.key, FONTS_JSON);
const got = sha256File(FONTS_JSON);
if (got !== manifest.fonts.sha256) {
  throw new Error(
    `fonts.json sha256 mismatch: manifest ${manifest.fonts.sha256} got ${got}`
  );
}
console.log(`[sync] fonts.json <- ${manifest.fonts.key} (verified)`);

// glyphs, extract the seed tarball.
{
  const tar = path.join(SCRATCH, "glyphs.tar.gz");
  r2Get(manifest.glyphs.key, tar);
  extractTar(tar, GLYPHS_DIR);
  console.log(
    `[sync] public/glyphs <- ${manifest.glyphs.key} (${manifest.glyphs.count} files)`
  );
}

// og: extract the base tarball, then layer every per-object delta on top.
{
  const tar = path.join(SCRATCH, "og.tar.gz");
  r2Get(manifest.og.base.key, tar);
  extractTar(tar, OG_DIR);
  console.log(`[sync] public/og <- ${manifest.og.base.key}`);
  const deltas = manifest.og.deltas ?? [];
  for (const key of deltas) {
    const name = key.slice("og/".length);
    r2Get(key, path.join(OG_DIR, name));
  }
  if (deltas.length) console.log(`[sync] applied ${deltas.length} OG deltas`);
}

console.log("[sync] done");
