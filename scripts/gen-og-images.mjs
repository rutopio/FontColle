// Build-time generator: one Open Graph image per font family, rendered in the
// family's OWN typeface. The card is a light canvas with the family name set
// large and centered, and the FontColle brand mark (stroked logo icon + a Paper
// Mono wordmark, on one row) near the bottom. Written to public/og/<id>.png
// (plus public/og/_default.png for the home page), so the share route serves a
// static asset with zero runtime work.
//
// How "set in its own face" works without a runtime font loader: we fetch each
// family's plain .ttf from the Google Fonts CSS2 API (asking for the exact
// glyphs the name needs via text=), trace the name to an SVG <path> with
// opentype.js, then rasterize the whole card to PNG with resvg. The font only
// exists at build time; the shipped artifact is a flat PNG.
//
// Run: pnpm gen:og   (re-run when the font list changes)
//
// Mirrors scripts/gen-specimen-svgs.mjs (same CSS2 + old-UA + opentype trace)
// and is intentionally build-time only, never in the app bundle.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/og");
const FONTS_JSON = resolve(ROOT, "public/fonts.json");

// Open Graph recommended 1.91:1 canvas.
const W = 1200;
const H = 630;

// Light canvas, black text — matches the site's default (light) chrome.
const BG = "#ffffff";
const FG = "#0a0a0a";

// The family name is scaled to fit inside this centered box (never upscaled).
const PAD_X = 100;
const NAME_BOX_TOP = 40;
const NAME_BOX_H = 430; // upper area; the wordmark strip sits below it
const NAME_MAX_SIZE = 200;

// An ancient UA makes the CSS2 API serve plain .ttf instead of .woff2, so we can
// hand the bytes straight to opentype.js (which doesn't decompress woff2).
const UA = "Mozilla/4.0";

// The FontColle mark: the four strokes from src/components/logo-icon.tsx (a
// shop-front arch), drawn stroked in FG with no backdrop, matching the sidebar.
const ICON_PATHS = [
  "M3 21H21V12C21 9.61305 20.0518 7.32387 18.364 5.63604C16.6761 3.94821 14.3869 3 12 3C9.61305 3 7.32387 3.94821 5.63604 5.63604C3.94821 7.32387 3 9.61305 3 12V21Z",
  "M3 17L21 17",
  "M9 17V13H21",
  "M13 13V9H20",
];

// Paper Mono (the site's font-mono face) embedded for the wordmark. resvg
// rasterizes the <text> using this @font-face, so we never decode woff2.
const PAPER_MONO_B64 = readFileSync(
  resolve(ROOT, "public/fonts/paper-mono.woff2")
).toString("base64");
const FONT_FACE =
  `@font-face{font-family:'Paper Mono';` +
  `src:url(data:font/woff2;base64,${PAPER_MONO_B64}) format('woff2');}`;

// Ask the CSS2 API for a family and return the first truetype/opentype src.
// `text` subsets the face to just those characters, so the name's font stays
// tiny. The subset (text=) endpoint serves an extension-less /l/font?kit= URL,
// so match on the format() hint rather than a file suffix (opentype.js can't
// decode woff2, so we must avoid the woff2 src).
async function fontUrl(family, text) {
  const fam = family.trim().replace(/\s+/g, "+");
  const q = text ? `&text=${encodeURIComponent(text)}` : "";
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${fam}&display=block${q}`,
    { headers: { "User-Agent": UA } }
  ).then((r) => r.text());
  const m =
    css.match(
      /url\((https:[^)]+)\)\s*format\(['"](?:truetype|opentype)['"]\)/
    ) || css.match(/url\((https:[^)]+\.(?:ttf|otf))\)/);
  if (!m) throw new Error(`no ttf url for ${family}\n${css.slice(0, 200)}`);
  return m[1];
}

async function loadFont(family, text) {
  const url = await fontUrl(family, text);
  const buf = Buffer.from(
    await fetch(url, { headers: { "User-Agent": UA } }).then((r) =>
      r.arrayBuffer()
    )
  );
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  );
}

// Trace `text` in `font`, then place it centered inside the box, scaled to fit
// on both axes (never upscaled past maxSize). Returns an SVG <path> string.
function centeredText(font, text, { boxX, boxY, boxW, boxH, maxSize }) {
  const scaleFor = (s) => s / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);

  let advance = 0;
  for (const g of glyphs) {
    advance += (g.advanceWidth ?? font.unitsPerEm) * scaleFor(maxSize);
  }
  const asc = font.ascender * scaleFor(maxSize);
  const desc = font.descender * scaleFor(maxSize); // negative
  const runH = asc - desc;

  const fit = Math.min(1, boxW / advance, boxH / runH);
  const fontSize = maxSize * fit;

  const path = new opentype.Path();
  let x = 0;
  for (const g of glyphs) {
    path.extend(g.getPath(x, 0, fontSize));
    x += (g.advanceWidth ?? font.unitsPerEm) * (fontSize / font.unitsPerEm);
  }
  const totalW = x;
  const a = font.ascender * (fontSize / font.unitsPerEm);
  const d = font.descender * (fontSize / font.unitsPerEm);
  const h = a - d;

  const tx = boxX + (boxW - totalW) / 2;
  const ty = boxY + (boxH - h) / 2 + a;
  return `<path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})" d="${path.toPathData(2)}" fill="${FG}"/>`;
}

// Bottom brand mark: the stroked logo icon and a Paper Mono "FontColle" on the
// SAME row, icon left of the word, the pair centered. Word is a <text> element
// (resvg lays it out via the embedded font); the icon is a stroked path group.
function wordmark() {
  const iconSize = 56; // icon viewBox is 24 units
  const iconScale = iconSize / 24;
  const gap = 16; // horizontal gap between icon and word
  const wordSize = 44;
  // Paper Mono is monospaced; "FontColle" is 9 chars, ~0.6em advance each.
  const wordW = "FontColle".length * wordSize * 0.6;

  const rowCenterY = H - 104;
  const totalW = iconSize + gap + wordW;
  const startX = (W - totalW) / 2;

  const iconY = rowCenterY - iconSize / 2;
  const icon =
    `<g transform="translate(${startX.toFixed(2)} ${iconY.toFixed(2)}) scale(${iconScale.toFixed(3)})" ` +
    `fill="none" stroke="${FG}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    ICON_PATHS.map((d) => `<path d="${d}"/>`).join("") +
    `</g>`;

  const wordX = startX + iconSize + gap;
  const word =
    `<text x="${wordX.toFixed(2)}" y="${rowCenterY}" text-anchor="start" ` +
    `dominant-baseline="central" font-family="Paper Mono" font-size="${wordSize}" fill="${FG}">FontColle</text>`;
  return icon + word;
}

function card(inner) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><style>${FONT_FACE}</style></defs>` +
    `<rect width="${W}" height="${H}" fill="${BG}"/>` +
    inner +
    `</svg>`
  );
}

function toPng(svg) {
  return new Resvg(svg, { fitTo: { mode: "width", value: W } })
    .render()
    .asPng();
}

const nameBox = {
  boxX: PAD_X,
  boxY: NAME_BOX_TOP,
  boxW: W - PAD_X * 2,
  boxH: NAME_BOX_H,
  maxSize: NAME_MAX_SIZE,
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Home-page default card: the big name in Paper Mono (via <text>) + wordmark.
  {
    const name =
      `<text x="${W / 2}" y="${NAME_BOX_TOP + NAME_BOX_H / 2}" text-anchor="middle" ` +
      `dominant-baseline="central" font-family="Paper Mono" font-size="140" fill="${FG}">FontColle</text>`;
    writeFileSync(
      resolve(OUT_DIR, "_default.png"),
      toPng(card(name + wordmark()))
    );
    console.log("wrote _default.png");
  }

  const fonts = JSON.parse(readFileSync(FONTS_JSON, "utf8"));
  const failed = [];
  let ok = 0;

  for (const { id, name } of fonts) {
    try {
      // Subset to the name's own characters; that's all the card renders.
      const font = await loadFont(name, name);
      const nameSvg = centeredText(font, name, nameBox);
      writeFileSync(
        resolve(OUT_DIR, `${id}.png`),
        toPng(card(nameSvg + wordmark()))
      );
      ok++;
    } catch (err) {
      // Fallback: render the name in Paper Mono so the card still exists.
      try {
        const nameSvg =
          `<text x="${W / 2}" y="${NAME_BOX_TOP + NAME_BOX_H / 2}" text-anchor="middle" ` +
          `dominant-baseline="central" font-family="Paper Mono" ` +
          `font-size="${Math.min(120, (W - PAD_X * 2) / (name.length * 0.6))}" ` +
          `fill="${FG}">${name.replace(/[<>&]/g, "")}</text>`;
        writeFileSync(
          resolve(OUT_DIR, `${id}.png`),
          toPng(card(nameSvg + wordmark()))
        );
        failed.push({
          id,
          name,
          reason: String(err).slice(0, 100),
          fellBack: true,
        });
      } catch (err2) {
        failed.push({
          id,
          name,
          reason: String(err2).slice(0, 100),
          fellBack: false,
        });
      }
    }
  }

  console.log(`wrote ${ok} font cards in their own face`);
  if (failed.length) {
    console.log(`\n${failed.length} needed fallback or failed:`);
    for (const f of failed) {
      console.log(
        `  ${f.fellBack ? "[fallback]" : "[FAILED]  "} ${f.id} — ${f.reason}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
