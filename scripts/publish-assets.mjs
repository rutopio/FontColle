// Publishes the data assets that were moved out of git into R2, and updates the
// git-versioned manifest (src/data/data-manifest.json). Two modes:
//
//   node scripts/publish-assets.mjs --seed
//     One-off bulk upload: tars public/glyphs and public/og into single seed
//     objects, uploads src/data/fonts.json as fonts/1.json, writes the manifest
//     from scratch. Run once during migration.
//
//   node scripts/publish-assets.mjs --daily [--og-ids=<file>]
//     Daily CI run after a harvest: uploads the new fonts.json as the next
//     fonts/<seq>.json version, puts each changed OG png as a per-object delta,
//     prunes old fonts versions (keeps KEEP_FONTS_VERSIONS), and rewrites the
//     manifest. glyphs are untouched (the daily harvest never changes them).
//
// Asset layout in the bucket:
//   fonts/<seq>.json          versioned fonts.json (seq increments daily)
//   glyphs/glyphs.tar.gz      seed tarball of every public/glyphs/*.json
//   og/og.tar.gz              seed tarball of the OG base set
//   og/<id>.png               daily deltas layered over the base tarball
//
// sync-assets.mjs reverses this: pulls the tarballs + fonts version + deltas
// back into public/ and src/data/ before the build.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BUCKET, MANIFEST_PATH, ROOT, r2Put, sha256File } from "./lib/r2.mjs";
import { makeTar } from "./lib/tar.mjs";

// R2 free tier is 10 GB and each fonts.json is ~21 MB, so unbounded daily
// versions would fill it in ~1.3 years. 30 versions ≈ 630 MB keeps a month of
// rollback headroom while staying comfortably free. Older versions are deleted
// after each daily publish.
const KEEP_FONTS_VERSIONS = 30;

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

function putFontsVersion(seq) {
  const key = `fonts/${seq}.json`;
  r2Put(key, FONTS_JSON);
  const entry = {
    key,
    seq,
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
  const fonts = putFontsVersion(1);
  const glyphs = putSeedTarball(GLYPHS_DIR, "glyphs/glyphs.tar.gz");
  const ogBase = putSeedTarball(OG_DIR, "og/og.tar.gz");
  writeManifest({
    version: 1,
    fonts,
    glyphs,
    og: { base: ogBase, deltas: [] },
  });
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

  // Next fonts version.
  const seq = manifest.fonts.seq + 1;
  const fonts = putFontsVersion(seq);

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

  // Prune old fonts versions beyond the retention window. Deletes are best
  // effort: a failed delete only wastes storage, it never corrupts the manifest.
  const oldest = seq - KEEP_FONTS_VERSIONS;
  for (let s = oldest; s >= 1; s--) {
    const key = `fonts/${s}.json`;
    try {
      const { spawnSync } = await import("node:child_process");
      const res = spawnSync(
        "npx",
        ["wrangler", "r2", "object", "delete", `${BUCKET}/${key}`, "--remote"],
        { cwd: ROOT, env: process.env, stdio: "ignore" }
      );
      if (res.status === 0) console.log(`[publish] pruned ${key}`);
      else break; // once a version is gone, older ones already are too
    } catch {
      break;
    }
  }
}

const args = process.argv.slice(2);
const ogIdsArg = args.find((a) => a.startsWith("--og-ids="));

if (args.includes("--seed")) {
  await seed();
} else if (args.includes("--daily")) {
  await daily(ogIdsArg?.slice("--og-ids=".length));
} else {
  console.error("usage: publish-assets.mjs --seed | --daily [--og-ids=<file>]");
  process.exit(2);
}
