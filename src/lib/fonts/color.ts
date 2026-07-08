import type { FontRecord } from "./types";

// Color (multicolor) font families on Google Fonts. Sourced from GF's
// authoritative `colorCapabilities` metadata field (COLRv0/v1, OTSVG); a font
// is "colorful" iff it carries a color table. Kept as a static frontend set
// because the dataset doesn't harvest the color-table flag — update this list
// when Google ships new color families. Note the color variant, not the plain
// base (e.g. "Bungee Spice", not "Bungee Color"; "Sixtyfour Convergence", not
// "Sixtyfour").
export const COLOR_FONTS = new Set<string>([
  "Aref Ruqaa Ink",
  "Bitcount Grid Double Ink",
  "Bitcount Grid Single Ink",
  "Bitcount Ink",
  "Bitcount Prop Double Ink",
  "Bitcount Prop Single Ink",
  "Bitcount Single Ink",
  "Blaka Ink",
  "Bungee Spice",
  "Bungee Tint",
  "Cairo Play",
  "Coral Pixels",
  "Foldit",
  "Honk",
  "Kalnia Glaze",
  "Nabla",
  "Noto Color Emoji",
  "Noto Znamenny Musical Notation",
  "Reem Kufi Fun",
  "Reem Kufi Ink",
  "Sixtyfour Convergence",
]);

export function isColorFont(font: FontRecord): boolean {
  return COLOR_FONTS.has(font.name);
}
