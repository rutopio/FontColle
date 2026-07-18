// One-off generator: pull the registered OpenType vendor IDs (OS/2 achVendID)
// and their foundry names from Microsoft's typography registry, so the Vendor
// facet can show "ParaType" instead of the bare 4-char code "PYRS".
//
// Source: https://learn.microsoft.com/en-us/typography/vendors/, one big HTML
// table of `<tr><td>ID</td><td>Foundry Name</td></tr>` rows, names often an
// anchor `<a href=…>Name</a>`. ~1760 entries; ~80% of our catalog's families
// carry a code that appears here.
//
// We clean the names lightly (strip trailing Inc./Ltd./GmbH/… and a trailing
// "(ABBR)" that just repeats the code) and fold codes to uppercase so they key
// the same way facets.ts folds them. A small OVERRIDES map fills the few
// high-count Google-ecosystem codes the MS registry doesn't list.
//
// Run: node scripts/gen-vendors-data.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(HERE, "../src/data/vendors.json");
const FONTS_JSON = resolve(HERE, "../src/data/fonts.json");

const PAGE_URL = "https://learn.microsoft.com/en-us/typography/vendors/";

// Codes absent from the MS registry but common in the Google Fonts catalog
// (Google-internal tags, tool artifacts, or foundries that never registered).
// Hand-maintained; keep it short, only worth an entry if several families use
// the code. Names verified from each foundry's own site / the font's METADATA.
const OVERRIDES = {
  AOEF: "Astigmatic One Eye",
  NEWT: "Vernon Adams",
  DINR: "Dalton Maag",
  CDK: "Cadson Demak",
  SUDT: "Sudtipos",
  IMPA: "Impallari Type",
  GWF: "Google Web Fonts",
  GTHB: "GitHub",
};

// Strip HTML tags and decode the few entities that appear in foundry names.
function stripHtml(s) {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

// Light cleanup: collapse whitespace, drop a trailing "(ABBR)" that only
// repeats an abbreviation, and trim common company suffixes. Conservative,
// we'd rather keep a slightly long name than mangle one.
function cleanName(name) {
  let n = name.replace(/\s+/g, " ").trim();
  // A "/ Made with X" tail (e.g. "PYRS Fontlab Ltd. / Made with FontLab").
  // Strip it first so the suffix rule below sees the real trailing token.
  n = n.replace(/\s*\/\s*Made with .*$/i, "").trim();
  // Trailing parenthetical that just echoes an acronym: "SIL International (SIL)".
  n = n.replace(/\s*\([A-Z][A-Za-z0-9 .&-]*\)\s*$/, "").trim();
  // Trailing corporate suffixes (with optional trailing period/comma).
  n = n
    .replace(
      /[,]?\s+(Inc|Ltd|LLC|GmbH|Co|Corp|Corporation|Company|Foundry|Type Foundry)\.?\s*$/i,
      ""
    )
    .trim();
  return n;
}

async function main() {
  const html = await fetch(PAGE_URL).then((r) => {
    if (!r.ok) throw new Error(`fetch ${r.status} for ${PAGE_URL}`);
    return r.text();
  });

  const map = {};
  // Table rows: `<tr><td>ID</td><td>Foundry Name</td>…</tr>`. Take the first
  // two cells of each row; skip the header (its cells are <th>, not <td>).
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  for (const [, inner] of html.matchAll(rowRe)) {
    const cells = [...inner.matchAll(cellRe)].map((c) =>
      stripHtml(c[1]).trim()
    );
    if (cells.length < 2) continue;
    const code = cells[0];
    const name = cleanName(cells[1]);
    // Vendor IDs are 1–4 visible chars; guard against stray rows.
    if (!code || code.length > 4 || !name) continue;
    map[code.toUpperCase()] = name;
  }

  // OVERRIDES win only where the registry has nothing (never clobber a real
  // registered name with a guess).
  for (const [code, name] of Object.entries(OVERRIDES)) {
    if (!map[code]) map[code] = name;
  }

  // The MS registry has ~1770 vendors; our catalog uses ~235. Ship only the
  // codes that actually appear (folded to uppercase, matching facets.ts), so
  // vendors.json stays a few KB instead of ~47KB of mostly-dead names.
  const used = new Set();
  for (const rec of JSON.parse(readFileSync(FONTS_JSON, "utf8"))) {
    const v = (rec.vendorId ?? "").trim().toUpperCase();
    if (v) used.add(v);
  }

  const sorted = Object.fromEntries(
    Object.entries(map)
      .filter(([code]) => used.has(code))
      .sort(([a], [b]) => a.localeCompare(b))
  );

  writeFileSync(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(
    `Wrote ${Object.keys(sorted).length} vendor names (of ${used.size} used, ${Object.keys(map).length} registered) to ${OUT_FILE}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
