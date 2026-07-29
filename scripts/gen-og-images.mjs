import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/og");
const FONTS_JSON = resolve(ROOT, "src/data/fonts.json");

const W = 1200;
const H = 630;

const BG = "#ffffff";
const FG = "#0a0a0a";

const PAD_X = 100;
const NAME_BOX_TOP = 40;
const NAME_BOX_H = 430;
const NAME_MAX_SIZE = 200;

// Old UA to get .ttf instead of .woff2 (opentype.js can't decompress woff2).
const UA = "Mozilla/4.0";

const ICON_PATHS = [
  "M3 21H21V12C21 9.61305 20.0518 7.32387 18.364 5.63604C16.6761 3.94821 14.3869 3 12 3C9.61305 3 7.32387 3.94821 5.63604 5.63604C3.94821 7.32387 3 9.61305 3 12V21Z",
  "M3 17L21 17",
  "M9 17V13H21",
  "M13 13V9H20",
];

const PAPER_MONO_B64 = readFileSync(
  resolve(ROOT, "public/fonts/paper-mono.woff2")
).toString("base64");
const FONT_FACE =
  `@font-face{font-family:'Paper Mono';` +
  `src:url(data:font/woff2;base64,${PAPER_MONO_B64}) format('woff2');}`;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadFont(family, text, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const url = await fontUrl(family, text);
      const buf = Buffer.from(
        await fetch(url, { headers: { "User-Agent": UA } }).then((r) =>
          r.arrayBuffer()
        )
      );
      return opentype.parse(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      );
    } catch (err) {
      last = err;
      if (i < tries - 1) await sleep(500 * (i + 1));
    }
  }
  throw last;
}

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

function wordmark() {
  const iconSize = 56;
  const iconScale = iconSize / 24;
  const gap = 16;
  const wordSize = 44;
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

function brandLockup() {
  const iconSize = 200;
  const iconScale = iconSize / 24;
  const gap = 48;
  const wordSize = 96;
  const wordVisualH = wordSize * 0.72;
  const stackH = iconSize + gap + wordVisualH;
  const top = (H - stackH) / 2;

  const iconX = (W - iconSize) / 2;
  const icon =
    `<g transform="translate(${iconX.toFixed(2)} ${top.toFixed(2)}) scale(${iconScale.toFixed(3)})" ` +
    `fill="none" stroke="${FG}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
    ICON_PATHS.map((d) => `<path d="${d}"/>`).join("") +
    `</g>`;

  const wordCenterY = top + iconSize + gap + wordVisualH / 2;
  const word =
    `<text x="${W / 2}" y="${wordCenterY.toFixed(2)}" text-anchor="middle" ` +
    `dominant-baseline="central" font-family="Paper Mono" font-size="${wordSize}" ` +
    `fill="${FG}">FontColle</text>`;
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
  writeFileSync(resolve(OUT_DIR, "_default.png"), toPng(card(brandLockup())));
  console.log("wrote _default.png");

  const force = process.argv.includes("--force");
  const idsArg = process.argv.find((a) => a.startsWith("--ids="));
  const onlyIds = idsArg
    ? new Set(
        readFileSync(idsArg.slice("--ids=".length), "utf8")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;
  const forceAll = force || onlyIds !== null;
  const fonts = JSON.parse(readFileSync(FONTS_JSON, "utf8")).filter(
    (f) => f.isPublished && f.name && (!onlyIds || onlyIds.has(f.id))
  );
  const failed = [];
  let ok = 0;
  let skipped = 0;

  for (let n = 0; n < fonts.length; n++) {
    const { id, name } = fonts[n];
    if (!forceAll && existsSync(resolve(OUT_DIR, `${id}.png`))) {
      skipped++;
      continue;
    }
    if (n % 100 === 0) console.log(`  …${n}/${fonts.length}`);
    try {
      const font = await loadFont(name, name);
      const nameSvg = centeredText(font, name, nameBox);
      writeFileSync(
        resolve(OUT_DIR, `${id}.png`),
        toPng(card(nameSvg + wordmark()))
      );
      ok++;
    } catch (err) {
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

  console.log(
    `wrote ${ok} font cards in their own face` +
      (skipped ? ` (skipped ${skipped} existing)` : "")
  );
  if (failed.length) {
    console.log(`\n${failed.length} needed fallback or failed:`);
    for (const f of failed) {
      console.log(
        `  ${f.fellBack ? "[fallback]" : "[FAILED]  "} ${f.id}: ${f.reason}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
