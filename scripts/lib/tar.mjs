// Seed-tarball helpers. Shells out to the system `tar` (present on both macOS
// dev and ubuntu-latest CI) so we ship glyphs/og as one object each instead of
// thousands of slow per-object puts. No new npm deps.

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

// Tar+gzip every file in `dir` into `outPath`, flat (no leading dir component,
// via -C dir .). Returns the file count so the manifest can record it.
//
// --no-xattrs stops macOS's bsdtar from writing its per-file
// `com.apple.provenance` extended attribute into the archive. Without it, GNU
// tar on the CI runner prints a `tar: Ignoring unknown extended header keyword
// 'LIBARCHIVE.xattr.com.apple.provenance'` warning for EVERY file on extract,
// flooding the build/action log. The flag is a no-op when tarring on Linux
// (no such xattr exists there), so it is safe on both platforms.
export function makeTar(dir, outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const res = spawnSync("tar", ["--no-xattrs", "-czf", outPath, "-C", dir, "."], {
    stdio: "inherit",
  });
  if (res.status !== 0) throw new Error(`tar create failed for ${dir}`);
  return readdirSync(dir).filter((f) => !f.startsWith(".")).length;
}

// Extract a tarball produced by makeTar into `destDir` (created if missing).
//
// --no-xattrs here means "don't restore extended attributes", which also
// silences GNU tar's per-file warning about the macOS provenance keyword when
// extracting an OLDER tarball that was sealed before makeTar dropped it. Belt
// and braces alongside the create-side flag; accepted by both bsdtar and GNU.
export function extractTar(tarPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const res = spawnSync("tar", ["--no-xattrs", "-xzf", tarPath, "-C", destDir], {
    stdio: "inherit",
  });
  if (res.status !== 0) throw new Error(`tar extract failed for ${tarPath}`);
}
