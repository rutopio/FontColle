// Regenerates the raster brand icons from public/favicon.svg, so the favicon,
// the iOS home-screen icon and the SVG never drift apart. Run after changing
// the mark: `node scripts/gen-icons.mjs`.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = readFileSync(resolve(ROOT, "public/favicon.svg"), "utf8");

function png(size) {
  return new Resvg(SVG, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
}

// .ico with a single 64x64 PNG-compressed entry. Every current browser reads
// PNG-in-ICO; the format's own BMP encoding is not worth hand-rolling.
function ico(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // offset

  return Buffer.concat([header, entry, pngBuf]);
}

const icoPng = png(64);
writeFileSync(resolve(ROOT, "public/favicon.ico"), ico(icoPng, 64));
console.log("wrote public/favicon.ico (64x64)");

writeFileSync(resolve(ROOT, "public/apple-touch-icon.png"), png(180));
console.log("wrote public/apple-touch-icon.png (180x180)");
