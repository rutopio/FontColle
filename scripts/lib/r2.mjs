// Thin helpers around `wrangler r2 object` for the asset-store pipeline
// (data-manifest.json + fontcolle-assets bucket). No new npm deps: shells out to
// the existing wrangler and uses node built-ins only.
//
// All commands need CLOUDFLARE_ACCOUNT_ID set to the account that owns the
// bucket, and --remote so they hit R2 rather than local miniflare storage.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const BUCKET = "fontcolle-assets";
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

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function sha256Buf(buf) {
  return createHash("sha256").update(buf).digest("hex");
}
