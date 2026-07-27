// Publishes the data assets to R2 and rewrites the manifest, which lives there
// too, so a daily harvest deploys with ZERO commits. sync-assets.mjs reverses
// this before the build.
//
//   --seed                    one-off bulk upload, writes a manifest from
//                             scratch. Run once during migration.
//   --daily [--og-ids=<file>] uploads fonts.json and the changed OG pngs as
//                             deltas. glyphs are untouched; old fonts versions
//                             expire via the R2 lifecycle rule below.
//
// Bucket layout, all content-hashed to dodge Cloudflare's cache:
//   fonts/<sha16>.json        fonts.json snapshot
//   glyphs/<sha16>.tar.gz     seed tarball of public/glyphs/*.json
//   og/og.tar.gz              seed tarball of the OG base set
//   og/<id>.png               daily deltas layered over that base

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  ROOT,
  r2GetManifest,
  r2Put,
  r2PutManifest,
  sha256File,
} from "./lib/r2.mjs";
import { makeTar } from "./lib/tar.mjs";

// Retention is enforced by R2, NOT this script, which can't enumerate what to
// delete without listing the bucket. Each fonts.json is ~21 MB against a 10 GB
// free tier, so the versions need expiring:
//
//   npx wrangler r2 bucket lifecycle add fontcolle-assets \
//     expire-fonts-versions fonts/ --expire-days 30

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

// --seed writes a manifest from scratch, so it is allowed to find nothing;
// daily/reseed require an existing one and let the throw surface.
function readManifest() {
  return r2GetManifest();
}

function writeManifest(m) {
  r2PutManifest(m);
}

// UTC keeps the key aligned with the workflow's 00:00 UTC schedule, so a run
// never straddles a local-timezone date boundary.
function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

// Keys must be CONTENT-HASHED, never dated or fixed: those overwrite in place,
// and both failure modes have bitten. A same-day re-run replaces the object the
// previous manifest names, so the next sync fails its sha256 check; and a fixed
// key is served from Cloudflare's cache, so a reseed leaves the deploy reading
// a stale tarball. A hash makes every content change a fresh key (a guaranteed
// cache miss) and every no-op change idempotent.
function putFontsVersion(date) {
  const sha256 = sha256File(FONTS_JSON);
  const key = `fonts/${sha256.slice(0, 16)}.json`;
  r2Put(key, FONTS_JSON);
  const entry = {
    key,
    date,
    sha256,
    bytes: statSync(FONTS_JSON).size,
  };
  console.log(`[publish] uploaded ${key} (${entry.bytes} bytes)`);
  return entry;
}

// Content-hashed for the reason above; the manifest records the exact key.
function putSeedTarball(dir, prefix) {
  const tarPath = path.join(SCRATCH, `${prefix}.tar.gz`);
  const count = makeTar(dir, tarPath);
  const sha256 = sha256File(tarPath);
  const key = `${prefix}/${sha256.slice(0, 16)}.tar.gz`;
  r2Put(key, tarPath);
  console.log(`[publish] uploaded ${key} (${count} files)`);
  return { key, sha256, count };
}

async function seed() {
  const fonts = putFontsVersion(today());
  const glyphs = putSeedTarball(GLYPHS_DIR, "glyphs");
  const ogBase = putSeedTarball(OG_DIR, "og");
  writeManifest({
    version: 1,
    fonts,
    glyphs,
    og: { base: ogBase, deltas: [] },
  });
}

// Re-tars ONLY the glyphs base. Glyph coverage has no daily delta channel
// (unlike OG), so a family added after the last seed ships a coverage file
// locally that never reaches R2 and 404s live. Run after a supplement adds
// families.
async function reseedGlyphs() {
  const manifest = readManifest();
  if (!manifest) throw new Error("no manifest; run --seed first");
  const glyphs = putSeedTarball(GLYPHS_DIR, "glyphs");
  writeManifest({ ...manifest, glyphs });
}

function readIds(file) {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function daily(ogIdsFile) {
  const manifest = readManifest();
  if (!manifest) throw new Error("no manifest; run --seed first");

  const fonts = putFontsVersion(today());

  // Accumulated into the manifest's delta set, so a fresh sync applies every
  // delta since the base tarball was built.
  const deltas = new Set(manifest.og.deltas ?? []);
  if (ogIdsFile && existsSync(ogIdsFile)) {
    for (const id of readIds(ogIdsFile)) {
      const file = path.join(OG_DIR, `${id}.png`);
      if (!existsSync(file)) continue;
      const key = `og/${id}.png`;
      r2Put(key, file);
      deltas.add(key);
    }
    console.log(
      `[publish] uploaded ${deltas.size - (manifest.og.deltas?.length ?? 0)} new OG deltas`
    );
  }

  const next = {
    ...manifest,
    fonts,
    og: { ...manifest.og, deltas: [...deltas].sort() },
  };
  writeManifest(next);
}

const args = process.argv.slice(2);
const ogIdsArg = args.find((a) => a.startsWith("--og-ids="));

if (args.includes("--seed")) {
  await seed();
} else if (args.includes("--daily")) {
  await daily(ogIdsArg?.slice("--og-ids=".length));
} else if (args.includes("--reseed-glyphs")) {
  await reseedGlyphs();
} else {
  console.error(
    "usage: publish-assets.mjs --seed | --daily [--og-ids=<file>] | --reseed-glyphs"
  );
  process.exit(2);
}
