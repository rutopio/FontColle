import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT, r2GetManifest } from "./lib/r2.mjs";

const args = process.argv.slice(2);
const fontsArg = args.find((a) => a.startsWith("--fonts="));
const manifestArg = args.find((a) => a.startsWith("--manifest="));

const fontsPath = fontsArg
  ? path.resolve(fontsArg.slice("--fonts=".length))
  : path.join(ROOT, "src/data/fonts.json");

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

if (now * 100 < old * 80) {
  console.error(
    `::error::fonts.json shrank more than 20% (${old} -> ${now} bytes); aborting`
  );
  process.exit(1);
}
console.log("shrinkage guard passed");
