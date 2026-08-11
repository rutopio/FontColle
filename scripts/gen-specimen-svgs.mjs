import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const OUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/specimens"
);

const CATEGORY_SPECIMEN = {
  Sans: "Inter",
  Serif: "Playfair Display",
  Display: "Bebas Neue",
  Script: "Dancing Script",
};

const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
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

const UA = "Mozilla/4.0";

const INCONSOLATA_WGHT = { min: 200, max: 900 };
const INCONSOLATA_WDTH = { min: 50, max: 200 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

async function fontUrl(family, { wght, wdth, ital } = {}) {
  const fam = family.trim().replace(/\s+/g, "+");
  let spec = fam;
  if (ital) {
    spec = wght != null ? `${fam}:ital,wght@1,${wght}` : `${fam}:ital@1`;
  } else if (wght != null && wdth != null) {
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

  const asc = font.ascender * scale;
  const desc = font.descender * scale;
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

  for (const [category, family] of Object.entries(CATEGORY_SPECIMEN)) {
    const font = await loadFont(family);
    const svg = specimenSvg(font);
    const name = `category-${category.toLowerCase()}.svg`;
    writeFileSync(resolve(OUT_DIR, name), svg);
    written.push(name);
    console.log(`  ${name}  <- ${family}`);
  }

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

  for (const w of WEIGHT_STEPS) {
    const wght = clamp(w, INCONSOLATA_WGHT.min, INCONSOLATA_WGHT.max);
    const font = await loadFont("Inconsolata", { wght, wdth: 100 });
    const svg = specimenSvg(font);
    const name = `weight-${w}.svg`;
    writeFileSync(resolve(OUT_DIR, name), svg);
    written.push(name);
    console.log(`  ${name}  <- Inconsolata wght@${wght}`);
  }

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
