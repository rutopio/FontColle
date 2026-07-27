// One-off generator: the "Aa" specimen outlines for the sidebar filter cards
// (Category / Weight / Width) as static SVGs under public/specimens/, so those
// cards don't depend on loading a webfont.
//
// Fetches each face from the CSS2 API at the exact axis tuple where relevant,
// then traces the "A" + "a" outlines into a single path per card.
//
// Run: node scripts/gen-specimen-svgs.mjs. Re-run when the specimen faces or
// the weight/width steps change.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const OUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/specimens"
);

// The representative face per category. Sole source of truth: the cards render
// the SVGs this emits (see specimen-icon.tsx), so nothing in src mirrors these.
const CATEGORY_SPECIMEN = {
  Sans: "Inter",
  Serif: "Playfair Display",
  Display: "Bebas Neue",
  Script: "Dancing Script",
  Mono: "JetBrains Mono",
};

// Mirrors src/lib/fonts/filter/weights.ts WEIGHT_STEPS.
const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
// Mirrors src/lib/fonts/filter/weights.ts WIDTH_STEP_PCT (step -> wdth %).
const WIDTH_STEP_PCT = {
  1: 50,
  2: 62.5,
  3: 75,
  4: 87.5,
  5: 100,
  6: 112.5,
  7: 125,
  8: 150,
  9: 200,
};

// An ancient UA makes the CSS2 API serve plain .ttf instead of .woff2, so we
// can hand the bytes straight to opentype.js (which doesn't decompress woff2).
const UA = "Mozilla/4.0";

// Inconsolata's real axis bounds. css2 serves an already-instanced static ttf
// per tuple, so a requested value outside these silently yields the nearest
// instance instead; clamping keeps each step's SVG the cut it claims to be.
const INCONSOLATA_WGHT = { min: 200, max: 900 };
const INCONSOLATA_WDTH = { min: 50, max: 200 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

async function fontUrl(family, { wght, wdth, ital } = {}) {
  const fam = family.trim().replace(/\s+/g, "+");
  let spec = fam;
  if (ital) {
    // css2 puts ital first (alphabetical): ital@1 for the italic style.
    spec = wght != null ? `${fam}:ital,wght@1,${wght}` : `${fam}:ital@1`;
  } else if (wght != null && wdth != null) {
    // css2 requires axis tags in alphabetical order: wdth before wght.
    spec = `${fam}:wdth,wght@${wdth},${wght}`;
  } else if (wght != null) {
    spec = `${fam}:wght@${wght}`;
  } else if (wdth != null) {
    spec = `${fam}:wdth@${wdth}`;
  }
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${spec}&display=block`,
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const m = css.match(/url\((https:[^)]+\.(?:ttf|otf))\)/);
  if (!m) throw new Error(`no ttf url for ${spec}\n${css.slice(0, 300)}`);
  return m[1];
}

// Fetch the .ttf css2 serves for the old UA and parse it with opentype.js.
async function loadFont(family, axes) {
  const url = await fontUrl(family, axes);
  const buf = Buffer.from(
    await fetch(url, {
      headers: { "User-Agent": UA },
    }).then((r) => r.arrayBuffer())
  );
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  );
}

function specimenSvg(font) {
  // Nominal: the viewBox comes from real glyph metrics, so this only sets the
  // coordinate scale.
  const size = 100;
  const unitsPerEm = font.unitsPerEm;
  const scale = size / unitsPerEm;

  const glyphs = font.stringToGlyphs("Aa");
  let x = 0;
  const path = new opentype.Path();
  for (const g of glyphs) {
    const gp = g.getPath(x, 0, size);
    path.extend(gp);
    x += (g.advanceWidth ?? unitsPerEm) * scale;
  }
  const totalWidth = x;

  // Tight-ish vertical box using ascender/descender so baselines align.
  const asc = font.ascender * scale;
  const desc = font.descender * scale; // negative
  const top = -asc;
  const height = asc - desc;

  const d = path.toPathData(2);
  const minX = 0;
  const width = totalWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}"><path d="${d}" fill="currentColor"/></svg>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const written = [];

  // Category cards: one representative face each, upright regular weight.
  for (const [category, family] of Object.entries(CATEGORY_SPECIMEN)) {
    const font = await loadFont(family);
    const svg = specimenSvg(font);
    const name = `category-${category.toLowerCase()}.svg`;
    writeFileSync(resolve(OUT_DIR, name), svg);
    written.push(name);
    console.log(`  ${name}  <- ${family}`);
  }

  // Category cards that aren't a primary class. Emoji has no meaningful "Aa",
  // so the UI shows an icon for it instead of a specimen SVG.
  {
    const slab = await loadFont("Roboto Slab");
    writeFileSync(resolve(OUT_DIR, "category-slab.svg"), specimenSvg(slab));
    written.push("category-slab.svg");
    console.log("  category-slab.svg  <- Roboto Slab");

    const ital = await loadFont("Playfair Display", { ital: true });
    writeFileSync(resolve(OUT_DIR, "category-italic.svg"), specimenSvg(ital));
    written.push("category-italic.svg");
    console.log("  category-italic.svg  <- Playfair Display italic");
  }

  // Weight cards: Inconsolata "Aa" at each weight step (wdth fixed at 100),
  // clamping wght to Inconsolata's 200..900 range like the live card.
  for (const w of WEIGHT_STEPS) {
    const wght = clamp(w, INCONSOLATA_WGHT.min, INCONSOLATA_WGHT.max);
    const font = await loadFont("Inconsolata", { wght, wdth: 100 });
    const svg = specimenSvg(font);
    const name = `weight-${w}.svg`;
    writeFileSync(resolve(OUT_DIR, name), svg);
    written.push(name);
    console.log(`  ${name}  <- Inconsolata wght@${wght}`);
  }

  // Width cards: Inconsolata "Aa" at each wdth percentage (wght fixed at 400),
  // clamping wdth to Inconsolata's 50..200 range like the live card.
  for (const [step, pct] of Object.entries(WIDTH_STEP_PCT)) {
    const wdth = clamp(pct, INCONSOLATA_WDTH.min, INCONSOLATA_WDTH.max);
    const font = await loadFont("Inconsolata", { wght: 400, wdth });
    const svg = specimenSvg(font);
    const name = `width-${step}.svg`;
    writeFileSync(resolve(OUT_DIR, name), svg);
    written.push(name);
    console.log(`  ${name}  <- Inconsolata wdth@${wdth}%`);
  }

  console.log(`\nWrote ${written.length} SVGs to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
