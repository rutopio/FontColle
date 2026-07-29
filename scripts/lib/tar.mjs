import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

// --no-xattrs avoids macOS xattr warnings on Linux CI.
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
