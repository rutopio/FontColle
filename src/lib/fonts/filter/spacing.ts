/**
 * The Spacing facet, kept in its own module with NO `@/` imports so the build
 * scripts (scripts/gen-facets.mjs) can import it directly under Node's
 * type-stripping, which does not resolve the tsconfig path alias. One authority
 * for "is this family monospaced", shared by the filter UI, the MCP server and
 * the pre-sharded facet slices.
 */

export const SPACING_VALUES = ["proportional", "mono"];
export const SPACING_LABELS: Record<string, string> = {
  proportional: "Proportional",
  mono: "Monospaced",
};

const MONOSPACE_TAG = "/Monospace/Monospace";

/**
 * Advance-width class, the dimension Google's own tag tree keeps orthogonal to
 * letterform: 46 of the 58 families it tags /Monospace also carry a /Sans,
 * /Serif, /Slab or /Script tag (Roboto Mono is Sans AND mono; Courier Prime is
 * Slab AND mono). The tag is the authority — every family it names scores 100,
 * with no middle ground — and apiCategory covers the families the tags CSV has
 * not reached (Iosevka Charon).
 *
 * The post table's `isFixedPitch` (FontRecord.isMonospace) is deliberately NOT
 * consulted: it is wrong in both directions here, missing true mono faces
 * (Azeret Mono, Oxygen Mono, Sono) while claiming faces that merely have even
 * advances (Press Start 2P, Rubik Mono One, Redacted, Wavefont, Noto Color
 * Emoji).
 */
export function fontSpacing(font: {
  tags?: Record<string, number> | null;
  apiCategory?: string | null;
}): string {
  const tagged = (font.tags?.[MONOSPACE_TAG] ?? 0) > 0;
  const api = (font.apiCategory ?? "").toUpperCase().includes("MONO");
  return tagged || api ? "mono" : "proportional";
}
