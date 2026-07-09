import type { FontRecord } from "./types";

// The four color-font formats, each keyed by the sfnt table that identifies it.
// CPAL (palettes) and CBLC (bitmap locations) are companion tables to COLR and
// CBDT, so they don't get their own entry. Displayed in this order.
//
// Google Fonts currently publishes only COLR/CPAL and OpenType-SVG faces (and
// six families carry both, for renderers that lack COLR support). sbix and
// CBDT/CBLC therefore show a count of 0 — they're kept as real, selectable
// filters so a font in either format surfaces the moment Google ships one.
export const COLOR_FORMATS = [
  { id: "COLR", label: "COLR/CPAL" },
  { id: "SVG", label: "OpenType-SVG" },
  { id: "sbix", label: "sbix" },
  { id: "CBDT", label: "CBDT/CBLC" },
] as const;

export type ColorFormatId = (typeof COLOR_FORMATS)[number]["id"];

const FORMAT_LABEL = new Map<string, string>(
  COLOR_FORMATS.map((f) => [f.id, f.label])
);

/** Human name for a color-format id ("SVG" -> "OpenType-SVG"). */
export function colorFormatLabel(id: string): string {
  return FORMAT_LABEL.get(id) ?? id;
}

/** A font is colorful iff it carries at least one color table. */
export function isColorFont(font: FontRecord): boolean {
  return font.colorTables.length > 0;
}

/**
 * The color formats a font provides. A font can carry several at once, so this
 * returns every match, not a single "primary" format.
 */
export function colorFormatsOf(font: FontRecord): ColorFormatId[] {
  return COLOR_FORMATS.filter((f) => font.colorTables.includes(f.id)).map(
    (f) => f.id
  );
}
