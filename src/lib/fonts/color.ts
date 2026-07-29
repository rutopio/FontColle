import type { FontRecord } from "./types";

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

