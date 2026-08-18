// No @/ imports: build scripts import this under Node's type-stripping.

export const SPACING_VALUES = ["proportional", "mono"];
export const SPACING_LABELS: Record<string, string> = {
  proportional: "Proportional",
  mono: "Monospaced",
};

const MONOSPACE_TAG = "/Monospace/Monospace";

/** Tag-based mono detection. isFixedPitch is not used (wrong in both directions). */
export function fontSpacing(font: {
  tags?: Record<string, number> | null;
  apiCategory?: string | null;
}): string {
  const tagged = (font.tags?.[MONOSPACE_TAG] ?? 0) > 0;
  const api = (font.apiCategory ?? "").toUpperCase().includes("MONO");
  return tagged || api ? "mono" : "proportional";
}
