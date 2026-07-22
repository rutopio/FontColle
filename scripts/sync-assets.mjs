// Pulls the data assets that live in R2 (per src/data/data-manifest.json) back
// into place so a build or local dev has them:
//
//   src/data/fonts.json   <- fonts/<YYYYMMDD>.json (the snapshot the manifest
//                            points at)
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

// Verify a just-downloaded file against the sha256 the manifest recorded, so a
// truncated download OR a stale copy served for a fixed key (glyphs/og tarballs
// keep the same key and are overwritten in place, unlike the dated fonts
// snapshot) fails loudly instead of silently shipping an old asset. This is why
// a reseeded glyphs tarball could deploy with the previous file set: the sync
// pulled the key with no integrity check and used whatever came back.
function verify(file, expected, label) {
  const got = sha256File(file);
  if (got !== expected) {
    throw new Error(`${label} sha256 mismatch: manifest ${expected} got ${got}`);
  }
}

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
mkdirSync(SCRATCH, { recursive: true });

// fonts.json, pull the manifest's current version and verify its hash.
r2Get(manifest.fonts.key, FONTS_JSON);
verify(FONTS_JSON, manifest.fonts.sha256, "fonts.json");
console.log(`[sync] fonts.json <- ${manifest.fonts.key} (verified)`);

// glyphs, extract the seed tarball. Verify BEFORE extract so a stale/truncated
// tarball fails here instead of shipping the wrong file set (fixed key, so a
// reseed overwrites in place — the download must match the manifest sha).
{
  const tar = path.join(SCRATCH, "glyphs.tar.gz");
  r2Get(manifest.glyphs.key, tar);
  verify(tar, manifest.glyphs.sha256, "glyphs.tar.gz");
  extractTar(tar, GLYPHS_DIR);
  console.log(
    `[sync] public/glyphs <- ${manifest.glyphs.key} (${manifest.glyphs.count} files, verified)`
  );
}

// og: extract the base tarball, then layer every per-object delta on top.
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
