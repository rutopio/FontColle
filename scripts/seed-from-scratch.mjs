import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARVESTER = path.join(ROOT, "scripts/harvester");
const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");

try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {}

const args = process.argv.slice(2);
const publish = args.includes("--publish");
const force = args.includes("--force");

function die(msg) {
  console.error(`\n[seed] ✗ ${msg}`);
  process.exit(1);
}

const requiredEnv = ["GOOGLE_FONTS_API_KEY", "GITHUB_TOKEN"];
if (publish) requiredEnv.push("CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID");
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) die(`missing env: ${missing.join(", ")}`);

if (existsSync(FONTS_JSON) && !force) {
  die(
    `${path.relative(ROOT, FONTS_JSON)} already exists. Seeding is whole-catalog ` +
      "and overwrites it; pass --force to proceed."
  );
}

let step = 0;
function run(label, cmd, cmdArgs, opts = {}) {
  step += 1;
  console.log(`\n[seed] ── step ${step}: ${label} ──`);
  console.log(`[seed]   ${cmd} ${cmdArgs.join(" ")}`);
  const res = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd ?? ROOT,
    stdio: opts.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: opts.input,
    env: process.env,
  });
  if (res.status !== 0) {
    die(`step ${step} (${label}) failed with exit ${res.status ?? res.signal}`);
  }
}

const py = process.env.PYTHON ?? "python3";
const node = process.execPath;

const enumScript =
  "import daily_update; " +
  "[print(f'{lic}\\t{d}') for d, lic in daily_update.list_all_families().items()]";
const enumRes = spawnSync(py, ["-c", enumScript], {
  cwd: HARVESTER,
  encoding: "utf8",
  env: process.env,
});
if (enumRes.status !== 0) {
  console.error(enumRes.stderr);
  die("enumerating families (list_all_families) failed");
}
const familyList = enumRes.stdout;
const familyCount = familyList.trim().split("\n").filter(Boolean).length;
console.log(`[seed] enumerated ${familyCount} families`);
run("harvest all families", py, ["harvest.py", "-"], {
  cwd: HARVESTER,
  input: familyList,
});

run("fetch published signals", py, ["fetch_published.py"], { cwd: HARVESTER });

run("to_dataset", py, ["to_dataset.py", "stress_output.json", FONTS_JSON], {
  cwd: HARVESTER,
});

for (const [label, script] of [
  ["tags", "backfill_tags.py"],
  ["form category", "backfill_form_category.py"],
  ["contrast", "backfill_contrast.py"],
  ["display names", "backfill_display_names.py"],
  ["about + designers", "backfill_about.py"],
  ["source repo url", "backfill_source.py"],
  ["license header", "backfill_license.py"],
  ["version history", "backfill_version_history.py"],
  ["glyph coverage", "backfill_glyph_coverage.py"],
]) {
  run(`backfill ${label}`, py, [script], { cwd: HARVESTER });
}

run("gen OG cards", node, ["scripts/gen-og-images.mjs", "--force"]);

if (publish) {
  run("publish --seed to R2", node, ["scripts/publish-assets.mjs", "--seed"]);
} else {
  console.log(
    "\n[seed] skipping R2 publish (pass --publish to seed the bucket)."
  );
}

console.log(
  `\n[seed] ✓ done. ${familyCount} families built locally` +
    (publish ? " and seeded to R2." : ".") +
    "\n[seed]   scripts.json / languages.json changed — commit them once.\n"
);
