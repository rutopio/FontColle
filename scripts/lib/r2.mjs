// Thin helpers around `wrangler r2 object` for the asset-store pipeline
// (data-manifest.json + fontcolle-assets bucket). No new npm deps: shells out to
// the existing wrangler and uses node built-ins only.
//
// All commands need CLOUDFLARE_ACCOUNT_ID set to the account that owns the
// bucket, and --remote so they hit R2 rather than local miniflare storage.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const BUCKET = "fontcolle-assets";

// The manifest — which fonts/glyphs/og snapshot the build should pull — lives
// in R2, NOT git, so a daily harvest updates it with zero commits and fires a
// Cloudflare Deploy Hook instead.
//
// A single fixed key is the build's well-known entry point. Safe here, unlike
// the big blobs that need content-hash keys: the manifest is read through
// wrangler's `--remote` R2 API, not the edge-cached public bucket URL.
//
// MANIFEST_PATH is only a LOCAL scratch copy (pnpm pull:data writes it,
// shrinkage-guard's --manifest fixture reads it).
export const MANIFEST_KEY = "manifest/latest.json";
export const MANIFEST_PATH = path.join(ROOT, "src/data/data-manifest.json");

// Required, with no fallback: an account id identifies a specific Cloudflare
// tenant, so a baked-in default would leak it AND silently point a fork's
// uploads at someone else's account.
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!ACCOUNT_ID) {
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID is not set. It must name the account that owns the " +
      `${BUCKET} R2 bucket. Set it in .env (see .env.example) or in the environment.`
  );
}

function wrangler(args, { input } = {}) {
  const res = spawnSync("npx", ["wrangler", ...args], {
    cwd: ROOT,
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID },
    input,
    encoding: input ? undefined : "utf8",
    maxBuffer: 1024 * 1024 * 1024,
    stdio: input
      ? ["pipe", "inherit", "inherit"]
      : ["ignore", "pipe", "inherit"],
  });
  if (res.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")} failed (exit ${res.status})`);
  }
  return res.stdout;
}

// Piped rather than passed by path, so binary/large files transfer intact.
export function r2Put(key, filePath) {
  const buf = readFileSync(filePath);
  wrangler(["r2", "object", "put", `${BUCKET}/${key}`, "--remote", "--pipe"], {
    input: buf,
  });
}

export function r2Get(key, destPath) {
  wrangler([
    "r2",
    "object",
    "get",
    `${BUCKET}/${key}`,
    "--remote",
    "--file",
    destPath,
  ]);
}

// The build's single source of truth for which snapshot to pull, so it must
// never read a stale copy: `--remote r2 object get` hits the R2 API directly,
// not the edge-cached bucket URL. Logs the resolved fonts key so a stale read
// is visible in CI.
export function r2GetManifest() {
  const tmp = path.join(ROOT, ".r2-manifest.json");
  r2Get(MANIFEST_KEY, tmp);
  const manifest = JSON.parse(readFileSync(tmp, "utf8"));
  rmSync(tmp, { force: true });
  console.log(`[r2] manifest ${MANIFEST_KEY} -> fonts ${manifest.fonts?.key}`);
  return manifest;
}

// Serialized 2-space with a trailing newline, matching what pull:data writes
// locally, so a diff against a pulled copy is clean.
export function r2PutManifest(manifest) {
  const tmp = path.join(ROOT, ".r2-manifest.json");
  writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  r2Put(MANIFEST_KEY, tmp);
  rmSync(tmp, { force: true });
  console.log(`[r2] wrote manifest ${MANIFEST_KEY}`);
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function sha256Buf(buf) {
  return createHash("sha256").update(buf).digest("hex");
}
