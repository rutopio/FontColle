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
/** Daily runs add a few dozen cards at most; well past that the base is stale. */
const MAX_OG_DELTAS = 300;
/** A harvest re-renders the cards it needs and republishes the base, so the
 *  deltas are wasted fetches there -- and refusing them would deadlock the one
 *  job that can clear an over-full manifest. Builds get the guard; harvests
 *  pass --skip-og-deltas. */
const SKIP_OG_DELTAS = process.argv.includes("--skip-og-deltas");

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
  const deltas = SKIP_OG_DELTAS ? [] : (manifest.og.deltas ?? []);
  if (SKIP_OG_DELTAS && (manifest.og.deltas?.length ?? 0) > 0) {
    console.log(
      `[sync] skipping ${manifest.og.deltas.length} OG deltas (--skip-og-deltas)`
    );
  }
  // Each delta is one wrangler subprocess, so the loop costs about a second per
  // entry. A manifest carrying the whole catalog would run past the build
  // timeout with no output -- fail fast and name the fix instead of hanging.
  if (deltas.length > MAX_OG_DELTAS) {
    throw new Error(
      `manifest carries ${deltas.length} OG deltas (limit ${MAX_OG_DELTAS}). ` +
        "The delta channel is for the handful of cards a daily run adds; this " +
        "many means the base tarball is stale. Run `node scripts/publish-assets.mjs " +
        "--reseed-og` to fold them into the base and clear the list."
    );
  }
  deltas.forEach((key, i) => {
    const name = key.slice("og/".length);
    r2Get(key, path.join(OG_DIR, name));
    // Without this the loop is silent, which is what made the timeout look
    // like a hang in an unrelated build step.
    if ((i + 1) % 25 === 0) {
      console.log(`[sync] OG deltas ${i + 1}/${deltas.length}`);
    }
  });
  if (deltas.length) console.log(`[sync] applied ${deltas.length} OG deltas`);
}

console.log("[sync] done");
