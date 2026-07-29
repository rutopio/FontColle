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

const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");
const GLYPHS_DIR = path.join(ROOT, "public/glyphs");
const OG_DIR = path.join(ROOT, "public/og");
const SCRATCH = path.join(ROOT, ".r2-tmp");

function readManifest() {
  return r2GetManifest();
}

function writeManifest(m) {
  r2PutManifest(m);
}

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

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

async function reseedGlyphs() {
  const manifest = readManifest();
  if (!manifest) throw new Error("no manifest; run --seed first");
  const glyphs = putSeedTarball(GLYPHS_DIR, "glyphs");
  writeManifest({ ...manifest, glyphs });
}

/** After a full re-render of public/og. The deltas exist to carry the handful
 *  of cards a daily run adds on top of the base tarball, so once the base
 *  contains every current card they are not just redundant but wrong — a
 *  client would fetch each one to overwrite a file the base already has right.
 *  Clearing them is the point of reseeding rather than publishing 1900 deltas. */
async function reseedOg() {
  const manifest = readManifest();
  if (!manifest) throw new Error("no manifest; run --seed first");
  const base = putSeedTarball(OG_DIR, "og");
  const dropped = manifest.og?.deltas?.length ?? 0;
  writeManifest({ ...manifest, og: { base, deltas: [] } });
  console.log(`[publish] og base reseeded, dropped ${dropped} stale deltas`);
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
} else if (args.includes("--reseed-og")) {
  await reseedOg();
} else {
  console.error(
    "usage: publish-assets.mjs --seed | --daily [--og-ids=<file>] | --reseed-glyphs | --reseed-og"
  );
  process.exit(2);
}
