import type { FontRecord } from "./types";

// Keyed by the sfnt table that identifies each format. CPAL and CBLC are
// companion tables to COLR and CBDT, so they get no entry of their own.
//
// Google publishes only COLR/CPAL and OpenType-SVG today, so sbix and CBDT/CBLC
// show a count of 0. They stay selectable, so a font in either format surfaces
// the moment Google ships one.
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

export function colorFormatLabel(id: string): string {
  return FORMAT_LABEL.get(id) ?? id;
}

export function isColorFont(font: FontRecord): boolean {
  return font.colorTables.length > 0;
}

/**
 * Every match: a font can carry several formats at once, so there is no single
 * "primary" one.
 */
