// Pulls the data assets that live in R2 (per the manifest at
// manifest/latest.json) into place for a build or local dev:
//
//   src/data/fonts.json   <- fonts/<sha16>.json (the snapshot the manifest
//                            points at; content-hashed key)
//   public/glyphs/*.json  <- glyphs/<sha16>.tar.gz (extracted)
//   public/og/*.png       <- og/og.tar.gz (extracted) + og/<id>.png deltas
//
// Runs before `pnpm build` in CI (Deploy step) and via `pnpm pull:data` after a
// fresh clone. Idempotent: it overwrites the local copies from R2 every time.
// Verifies the fonts.json sha256 against the manifest so a truncated download
// fails loudly instead of shipping a corrupt catalog.
//
// No new npm deps: node built-ins + wrangler (via lib/r2.mjs) + system tar.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT, r2Get, r2GetManifest, sha256File } from "./lib/r2.mjs";
import { extractTar } from "./lib/tar.mjs";

// Verify against the sha256 the manifest recorded, so a truncated download OR
// a stale copy served for a fixed key fails loudly instead of silently
// shipping an old asset. Without this a reseeded glyphs tarball deploys with
// the previous file set.
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

// Pull the current pointer before resolving any snapshot key.
const manifest = r2GetManifest();
mkdirSync(SCRATCH, { recursive: true });

// fonts.json, pull the manifest's current version and verify its hash.
r2Get(manifest.fonts.key, FONTS_JSON);
verify(FONTS_JSON, manifest.fonts.sha256, "fonts.json");
console.log(`[sync] fonts.json <- ${manifest.fonts.key} (verified)`);

// Verify BEFORE extracting, so a stale or truncated tarball fails here rather
// than shipping the wrong file set.
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
