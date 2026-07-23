// Publishes the data assets that were moved out of git into R2, and updates the
// manifest — which ALSO lives in R2 now (manifest/latest.json), not git, so a
// daily harvest updates R2 and fires a Cloudflare Deploy Hook with ZERO commits.
// Two modes:
//
//   node scripts/publish-assets.mjs --seed
//     One-off bulk upload: tars public/glyphs and public/og into single seed
//     objects, uploads src/data/fonts.json as fonts/<sha16>.json, writes the
//     manifest from scratch. Run once during migration.
//
//   node scripts/publish-assets.mjs --daily [--og-ids=<file>]
//     Daily CI run after a harvest: uploads the new fonts.json as
//     fonts/<sha16>.json, puts each changed OG png as a per-object delta, and
//     rewrites the manifest. glyphs are untouched (the daily harvest never
//     changes them). Old fonts versions are NOT pruned here: an R2 lifecycle
//     rule on the fonts/ prefix expires them (see the retention note below).
//
// Asset layout in the bucket (all content-hashed to dodge Cloudflare's cache):
//   fonts/<sha16>.json        fonts.json snapshot (one per distinct content)
//   glyphs/<sha16>.tar.gz     seed tarball of every public/glyphs/*.json
//   og/og.tar.gz              seed tarball of the OG base set
//   og/<id>.png               daily deltas layered over the base tarball
//
// sync-assets.mjs reverses this: pulls the tarballs + fonts version + deltas
// back into public/ and src/data/ before the build.

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

// R2 free tier is 10 GB and each fonts.json is ~21 MB, so unbounded versions
// would fill it in ~1.3 years. A lifecycle rule on the fonts/ prefix expires
// objects 30 days after creation (≈630 MB of headroom), keeping a month of
// rollback while staying comfortably free. Apply it with:
//
//   npx wrangler r2 bucket lifecycle add fontcolle-assets \
//     expire-fonts-versions fonts/ --expire-days 30
//
// Keys are now content-hashed (fonts/<sha16>.json), so there is one object per
// distinct catalog CONTENT, not per day: an unreferenced old hash simply ages
// out while the manifest always points at a fresh one. Identical content
// re-publishes to the same key (no new object). Retention is enforced by R2, not
// this script: it can't enumerate what to delete without listing the bucket.

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

// The manifest lives in R2 now (not git): the daily harvest rewrites it there
// and fires a Cloudflare Deploy Hook, so a data-only day produces no commit.
// --seed writes a manifest from scratch, so its readManifest is allowed to find
// nothing (r2GetManifest would throw on a missing key); daily/reseed require an
// existing one and let the throw surface.
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

// Upload fonts.json under a CONTENT-HASHED key (fonts/<sha16>.json), like glyphs
// and og. A per-day key (fonts/<YYYYMMDD>.json) was overwrite-in-place, so a
// same-day workflow_dispatch re-run replaced the object the previous manifest
// named — and the next sync failed the sha256 check (observed: the 2026-07-22
// 02:57 run failed with "fonts.json sha256 mismatch"). A content hash makes the
// key change whenever the bytes change: identical bytes re-publish to the same
// key (idempotent no-op), different bytes get a fresh key (never an overwrite),
// so drift is structurally impossible. `date` stays as informational metadata.
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

// Tar `dir` and upload under a CONTENT-HASHED key (prefix/<sha>.tar.gz), not a
// fixed one. A fixed key (glyphs/glyphs.tar.gz) is served through Cloudflare's
// cache, so re-seeding new content under the same key left `r2 object get` — the
// deploy's sync uses it — reading the STALE cached tarball: the reseeded Google
// Sans / Edu Hand coverage never reached the built site, and its Glyphs panel
// 404'd. A hash in the key changes it whenever content changes, so a fresh key
// is always a cache miss and the new bytes are read. The manifest records the
// exact key, so sync fetches the right one. (fonts already dodged this via its
// dated key; glyphs/og did not.)
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

// Re-tar and re-upload ONLY the glyphs base, rewriting just the manifest's
// glyphs entry. glyph coverage has no daily delta channel (unlike OG), so a
// family added after the last seed — the apiOnly supplement set (Google Sans,
// Edu Hand) — ships a coverage file locally that never reaches R2, and its
// Glyphs panel 404s live. Run this after a supplement adds families.
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
