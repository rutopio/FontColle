// Seed-tarball helpers. Shells out to the system `tar` (present on both macOS
// dev and ubuntu-latest CI) so we ship glyphs/og as one object each instead of
// thousands of slow per-object puts. No new npm deps.

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

// Tar+gzip every file in `dir` into `outPath`, flat (no leading dir component,
// via -C dir .). Returns the file count so the manifest can record it.
export function makeTar(dir, outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const res = spawnSync("tar", ["-czf", outPath, "-C", dir, "."], {
    stdio: "inherit",
  });
  if (res.status !== 0) throw new Error(`tar create failed for ${dir}`);
  return readdirSync(dir).filter((f) => !f.startsWith(".")).length;
}

// Extract a tarball produced by makeTar into `destDir` (created if missing).
export function extractTar(tarPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const res = spawnSync("tar", ["-xzf", tarPath, "-C", destDir], {
    stdio: "inherit",
  });
  if (res.status !== 0) throw new Error(`tar extract failed for ${tarPath}`);
}
