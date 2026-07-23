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

// The manifest (the pointer at which fonts/glyphs/og snapshot the build should
// pull) lives in R2 now, NOT git — so a daily harvest updates it with zero
// commits and triggers the deploy via a Cloudflare Deploy Hook instead. A single
// fixed key is the build's well-known entry point; unlike the big blobs (which
// use content-hash keys to dodge Cloudflare's edge cache), the manifest is read
// through wrangler's `--remote` R2 API, not the cached public bucket URL, so a
// fixed key is safe here. MANIFEST_PATH is only a LOCAL scratch/dev copy now
// (pnpm pull:data writes it; shrinkage-guard's --manifest fixture uses it); it
// is no longer git-versioned.
export const MANIFEST_KEY = "manifest/latest.json";
export const MANIFEST_PATH = path.join(ROOT, "src/data/data-manifest.json");

// wrangler resolves the account from CLOUDFLARE_ACCOUNT_ID. Required, with no
// fallback: an account id identifies a specific Cloudflare tenant, so baking
// one in would both leak it and silently point a fork's uploads at someone
// else's account. Failing loudly here beats a confusing wrangler auth error.
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

// Upload a local file to `key`. Reads bytes and pipes them so binary/large
// files transfer intact.
export function r2Put(key, filePath) {
  const buf = readFileSync(filePath);
  wrangler(["r2", "object", "put", `${BUCKET}/${key}`, "--remote", "--pipe"], {
    input: buf,
  });
}

// Download `key` into `destPath`.
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

// Read the manifest from R2 and return it parsed. This is the build's single
// source of truth for which snapshot to pull, so it must never read a stale
// copy: wrangler's `--remote r2 object get` hits the R2 API directly (not the
// edge-cached public bucket URL), so the fixed MANIFEST_KEY returns current
// bytes. Logs the fonts key it resolved so a stale read is visible in CI.
export function r2GetManifest() {
  const tmp = path.join(ROOT, ".r2-manifest.json");
  r2Get(MANIFEST_KEY, tmp);
  const manifest = JSON.parse(readFileSync(tmp, "utf8"));
  rmSync(tmp, { force: true });
  console.log(`[r2] manifest ${MANIFEST_KEY} -> fonts ${manifest.fonts?.key}`);
  return manifest;
}

// Upload the manifest object to R2 under the fixed pointer key. Serialized the
// same way the old git file was (2-space, trailing newline) so a diff against a
// pulled copy is clean.
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
