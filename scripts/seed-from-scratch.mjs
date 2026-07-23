// Single-entry orchestrator for building the WHOLE dataset from nothing — the
// one-time manual seed the incremental daily workflow can't do (it diffs the
// previous fonts.json and reads the existing R2 manifest, neither of which
// exists yet). It shells out to the existing scripts in the documented order
// with fail-fast, so a bootstrap can't run steps out of order or skip a
// backfill. See docs/data-pipeline.md for what each step does.
//
//   node scripts/seed-from-scratch.mjs             # local dataset only, no R2
//   node scripts/seed-from-scratch.mjs --publish   # + seed R2 (remote write)
//   node scripts/seed-from-scratch.mjs --force      # overwrite an existing fonts.json
//
// Env required up front (fails early if missing):
//   GOOGLE_FONTS_API_KEY  ranking + about + display names
//   GITHUB_TOKEN          repo tree enumeration + version history (60 req/hr otherwise)
//   CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID   only when --publish
//
// No new npm deps: node built-ins + the scripts it calls.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HARVESTER = path.join(ROOT, "scripts/harvester");
const FONTS_JSON = path.join(ROOT, "src/data/fonts.json");

// Load .env like the rest of the pipeline expects its vars to be present. Node
// 20.12+ has loadEnvFile; ignore a missing file (CI passes vars directly).
try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  // no .env — vars must already be in the environment (as in CI)
}

const args = process.argv.slice(2);
const publish = args.includes("--publish");
const force = args.includes("--force");

function die(msg) {
  console.error(`\n[seed] ✗ ${msg}`);
  process.exit(1);
}

// Fail before doing any work if the environment or state is wrong.
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
// Run a command, streaming its output; abort the whole seed on non-zero exit.
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

// 1. Enumerate every family, harvest + parse each. list_all_families() (in
//    daily_update.py) is the authority on which families exist; pipe its
//    "<license>\t<family_dir>" lines into harvest.py. Also fills ttf_cache/,
//    which glyph coverage reads in step 9.
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

// 2. Developer API signals BEFORE building the dataset (else every family is
//    marked published, unranked).
run("fetch published signals", py, ["fetch_published.py"], { cwd: HARVESTER });

// 3. Raw harvest -> dataset. Writes fonts.json + scripts.json + languages.json.
run("to_dataset", py, ["to_dataset.py", "stress_output.json", FONTS_JSON], {
  cwd: HARVESTER,
});

// 4-8. Whole-catalog backfills for fields to_record() leaves null (no --ids, so
//      they cover every family). Order is loose except glyph coverage, which
//      reads ttf_cache/ and so must come after the harvest (step 1).
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

// 9. Render every OG card.
run("gen OG cards", node, ["scripts/gen-og-images.mjs", "--force"]);

// 10. Seed R2 (remote write) — only with --publish.
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
