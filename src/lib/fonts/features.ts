// OpenType feature metadata: human-readable names + which features browsers
// enable by default per the W3C CSS Fonts spec.

// Features engines apply by default for normal text. The UI shows these ON
// initially; setting font-feature-settings overrides the browser default, so we
// only emit a default-on feature when the user explicitly turns it OFF.
export const DEFAULT_ON = new Set([
  "calt", // Contextual Alternates
  "liga", // Standard Ligatures
  "clig", // Contextual Ligatures
  "rlig", // Required Ligatures
  "kern", // Kerning (font-kerning: auto)
  "mark", // Mark Positioning
  "mkmk", // Mark-to-Mark Positioning
  "locl", // Localized Forms
  "ccmp", // Glyph Composition / Decomposition
  "rclt", // Required Contextual Alternates
]);

// Human-readable names for the feature tags we surface. Unknown tags fall back
// to the raw tag so the list is always complete.
export const FEATURE_NAMES: Record<string, string> = {
  aalt: "Access All Alternates",
  calt: "Contextual Alternates",
  case: "Case-Sensitive Forms",
  ccmp: "Glyph Composition",
  clig: "Contextual Ligatures",
  c2sc: "Small Caps From Capitals",
  cpsp: "Capital Spacing",
  dlig: "Discretionary Ligatures",
  dnom: "Denominators",
  frac: "Fractions",
  hist: "Historical Forms",
  hlig: "Historical Ligatures",
  kern: "Kerning",
  liga: "Standard Ligatures",
  lnum: "Lining Figures",
  locl: "Localized Forms",
  mark: "Mark Positioning",
  mkmk: "Mark-to-Mark Positioning",
  numr: "Numerators",
  onum: "Oldstyle Figures",
  ordn: "Ordinals",
  pnum: "Proportional Figures",
  rlig: "Required Ligatures",
  rclt: "Required Contextual Alternates",
  salt: "Stylistic Alternates",
  sinf: "Scientific Inferiors",
  smcp: "Small Capitals",
  subs: "Subscript",
  sups: "Superscript",
  titl: "Titling",
  tnum: "Tabular Figures",
  zero: "Slashed Zero",
};

export function featureName(tag: string): string {
  if (FEATURE_NAMES[tag]) return FEATURE_NAMES[tag];
  const m = /^ss(\d\d)$/.exec(tag);
  if (m) return `Stylistic Set ${Number(m[1])}`;
  const cv = /^cv(\d\d)$/.exec(tag);
  if (cv) return `Character Variant ${Number(cv[1])}`;
  return tag;
}

/**
 * Build the `font-feature-settings` value from the user's overrides.
 * `overrides` maps tag -> desired on/off. We only emit entries that differ from
 * the browser default, so untouched default-on features keep the engine default.
 */
export function buildFeatureSettings(
  overrides: Record<string, boolean>
): string | undefined {
  const parts: string[] = [];
  for (const [tag, on] of Object.entries(overrides)) {
    const isDefaultOn = DEFAULT_ON.has(tag);
    if (on && !isDefaultOn) parts.push(`"${tag}" 1`);
    if (!on && isDefaultOn) parts.push(`"${tag}" 0`);
  }
  return parts.length ? parts.join(", ") : undefined;
}
