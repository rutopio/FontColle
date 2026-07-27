// Guards against a harvest that silently loses most of the dataset: an upstream
// fetch failure looks like a mass "removal". fonts.json isn't in git, so there
// is nothing to diff against HEAD; instead this compares the new local file
// against the byte count in the CURRENT R2 manifest, which still points at the
// previous version because this runs BEFORE publish-assets rewrites it.
//
//   node scripts/shrinkage-guard.mjs [--fonts=<path>] [--manifest=<path>]
//
// Exits non-zero (fails CI) when new < 80% of the manifest baseline. Params let
// the local test drive it against a deliberately shrunk fixture.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT, r2GetManifest } from "./lib/r2.mjs";

const args = process.argv.slice(2);
const fontsArg = args.find((a) => a.startsWith("--fonts="));
const manifestArg = args.find((a) => a.startsWith("--manifest="));

const fontsPath = fontsArg
  ? path.resolve(fontsArg.slice("--fonts=".length))
  : path.join(ROOT, "src/data/fonts.json");

// --manifest=<path> overrides with a local file, so the test can drive a
// deliberately shrunk fixture.
const manifest = manifestArg
  ? JSON.parse(readFileSync(manifestArg.slice("--manifest=".length), "utf8"))
  : r2GetManifest();
const old = manifest.fonts?.bytes;
if (typeof old !== "number") {
  console.error("::error::manifest has no fonts.bytes baseline");
  process.exit(1);
}
const now = statSync(fontsPath).size;
console.log(`fonts.json bytes: manifest baseline=${old} new=${now}`);

// Fail if new < 80% of old (integer math: new*100 < old*80).
if (now * 100 < old * 80) {
  console.error(
    `::error::fonts.json shrank more than 20% (${old} -> ${now} bytes); aborting`
  );
  process.exit(1);
}
console.log("shrinkage guard passed");
