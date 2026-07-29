import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const BUCKET = "fontcolle-assets";

export const MANIFEST_KEY = "manifest/latest.json";
export const MANIFEST_PATH = path.join(ROOT, "src/data/data-manifest.json");

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

export function r2GetManifest() {
  const tmp = path.join(ROOT, ".r2-manifest.json");
  r2Get(MANIFEST_KEY, tmp);
  const manifest = JSON.parse(readFileSync(tmp, "utf8"));
  rmSync(tmp, { force: true });
  console.log(`[r2] manifest ${MANIFEST_KEY} -> fonts ${manifest.fonts?.key}`);
  return manifest;
}

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
