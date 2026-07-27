// Shells out to the system `tar`, so glyphs/og ship as one object each rather
// than thousands of slow per-object puts.

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

// --no-xattrs stops macOS's bsdtar writing a per-file `com.apple.provenance`
// xattr into the archive, which makes GNU tar on the CI runner warn once per
// file on extract and flood the log. A no-op on Linux.
export function makeTar(dir, outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const res = spawnSync(
    "tar",
    ["--no-xattrs", "-czf", outPath, "-C", dir, "."],
    {
      stdio: "inherit",
    }
  );
  if (res.status !== 0) throw new Error(`tar create failed for ${dir}`);
  return readdirSync(dir).filter((f) => !f.startsWith(".")).length;
}

// --no-xattrs again, to stay quiet on an OLDER tarball sealed before makeTar
// started dropping the xattr. Accepted by both bsdtar and GNU.
export function extractTar(tarPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const res = spawnSync(
    "tar",
    ["--no-xattrs", "-xzf", tarPath, "-C", destDir],
    {
      stdio: "inherit",
    }
  );
  if (res.status !== 0) throw new Error(`tar extract failed for ${tarPath}`);
}
