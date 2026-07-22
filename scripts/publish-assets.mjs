// Publishes the data assets that were moved out of git into R2, and updates the
// git-versioned manifest (src/data/data-manifest.json). Two modes:
//
//   node scripts/publish-assets.mjs --seed
//     One-off bulk upload: tars public/glyphs and public/og into single seed
//     objects, uploads src/data/fonts.json as fonts/1.json, writes the manifest
//     from scratch. Run once during migration.
//
//   node scripts/publish-assets.mjs --daily [--og-ids=<file>]
//     Daily CI run after a harvest: uploads the new fonts.json as
//     fonts/<YYYYMMDD>.json, puts each changed OG png as a per-object delta, and
//     rewrites the manifest. glyphs are untouched (the daily harvest never
//     changes them). Old fonts versions are NOT pruned here: an R2 lifecycle
//     rule on the fonts/ prefix expires them (see FONTS_RETENTION_DAYS below).
//
// Asset layout in the bucket:
//   fonts/<YYYYMMDD>.json     dated fonts.json snapshot (one per changed day)
//   glyphs/glyphs.tar.gz      seed tarball of every public/glyphs/*.json
//   og/og.tar.gz              seed tarball of the OG base set
//   og/<id>.png               daily deltas layered over the base tarball
//
// sync-assets.mjs reverses this: pulls the tarballs + fonts version + deltas
// back into public/ and src/data/ before the build.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MANIFEST_PATH, ROOT, r2Put, sha256File } from "./lib/r2.mjs";
import { makeTar } from "./lib/tar.mjs";

// R2 free tier is 10 GB and each fonts.json is ~21 MB, so unbounded daily
// versions would fill it in ~1.3 years. A lifecycle rule on the fonts/ prefix
// expires objects after 30 days (≈630 MB), keeping a month of rollback headroom
// while staying comfortably free. Apply it with:
//
//   npx wrangler r2 bucket lifecycle add fontcolle-assets \
//     expire-fonts-versions fonts/ --expire-days 30
//
// Retention is enforced by R2, not by this script: dated keys are sparse (no
// snapshot on days the catalog did not change), so nothing here can enumerate
// what to delete without listing the bucket.

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function writeManifest(m) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(m, null, 2)}\n`, "utf8");
  console.log(`[publish] wrote manifest ${MANIFEST_PATH}`);
}

// UTC keeps the key aligned with the workflow's 00:00 UTC schedule, so a run
// never straddles a local-timezone date boundary.
function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function putFontsVersion(date) {
  const key = `fonts/${date}.json`;
  r2Put(key, FONTS_JSON);
  const entry = {
    key,
    date,
    sha256: sha256File(FONTS_JSON),
    bytes: statSync(FONTS_JSON).size,
  };
  console.log(`[publish] uploaded ${key} (${entry.bytes} bytes)`);
  return entry;
}

function putSeedTarball(dir, key) {
  const tarPath = path.join(SCRATCH, path.basename(key));
  const count = makeTar(dir, tarPath);
  r2Put(key, tarPath);
  const entry = { key, sha256: sha256File(tarPath), count };
  console.log(`[publish] uploaded ${key} (${count} files)`);
  return entry;
}

async function seed() {
  const fonts = putFontsVersion(today());
  const glyphs = putSeedTarball(GLYPHS_DIR, "glyphs/glyphs.tar.gz");
  const ogBase = putSeedTarball(OG_DIR, "og/og.tar.gz");
  writeManifest({
    version: 1,
    fonts,
    glyphs,
    og: { base: ogBase, deltas: [] },
  });
}

// Re-tar and re-upload ONLY the glyphs base, rewriting just the manifest's
// glyphs entry. glyph coverage has no daily delta channel (unlike OG), so a
// family added after the last seed — the apiOnly supplement set (Google Sans,
// Edu Hand) — ships a coverage file locally that never reaches R2, and its
// Glyphs panel 404s live. Run this after a supplement adds families.
async function reseedGlyphs() {
  const manifest = readManifest();
  if (!manifest) throw new Error("no manifest; run --seed first");
  const glyphs = putSeedTarball(GLYPHS_DIR, "glyphs/glyphs.tar.gz");
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

  // Today's snapshot. A same-day rerun (workflow_dispatch) overwrites it, which
  // is intended: the newest harvest for a given day is the one worth keeping.
  const fonts = putFontsVersion(today());

  // OG deltas: only the changed families (og_ids.txt). Each becomes a per-object
  // put layered over the base tarball. Accumulate into the manifest's delta set
  // so a fresh sync applies every delta since the base was built.
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
