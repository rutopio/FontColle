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

// Human-readable names per the OpenType 1.9.1 registered feature list
// (https://learn.microsoft.com/typography/opentype/spec/featurelist).
// Unknown tags fall back to the raw tag so the list is always complete.
export const FEATURE_NAMES: Record<string, string> = {
  aalt: "Access All Alternates",
  abvf: "Above-base Forms",
  abvm: "Above-base Mark Positioning",
  abvs: "Above-base Substitutions",
  afrc: "Alternative Fractions",
  akhn: "Akhand",
  apkn: "Kerning for Alternate Proportional Widths",
  blwf: "Below-base Forms",
  blwm: "Below-base Mark Positioning",
  blws: "Below-base Substitutions",
  calt: "Contextual Alternates",
  case: "Case-Sensitive Forms",
  ccmp: "Glyph Composition / Decomposition",
  cfar: "Conjunct Form After Ro",
  chws: "Contextual Half-width Spacing",
  cjct: "Conjunct Forms",
  clig: "Contextual Ligatures",
  cpct: "Centered CJK Punctuation",
  cpsp: "Capital Spacing",
  cswh: "Contextual Swash",
  curs: "Cursive Positioning",
  c2pc: "Petite Capitals From Capitals",
  c2sc: "Small Capitals From Capitals",
  dist: "Distances",
  dlig: "Discretionary Ligatures",
  dnom: "Denominators",
  dtls: "Dotless Forms",
  expt: "Expert Forms",
  falt: "Final Glyph on Line Alternates",
  fin2: "Terminal Forms #2",
  fin3: "Terminal Forms #3",
  fina: "Terminal Forms",
  flac: "Flattened Accent Forms",
  frac: "Fractions",
  fwid: "Full Widths",
  half: "Half Forms",
  haln: "Halant Forms",
  halt: "Alternate Half Widths",
  hist: "Historical Forms",
  hkna: "Horizontal Kana Alternates",
  hlig: "Historical Ligatures",
  hngl: "Hangul",
  hojo: "Hojo Kanji Forms",
  hwid: "Half Widths",
  init: "Initial Forms",
  isol: "Isolated Forms",
  ital: "Italics",
  jalt: "Justification Alternates",
  jp04: "JIS2004 Forms",
  jp78: "JIS78 Forms",
  jp83: "JIS83 Forms",
  jp90: "JIS90 Forms",
  kern: "Kerning",
  lfbd: "Left Bounds",
  liga: "Standard Ligatures",
  ljmo: "Leading Jamo Forms",
  lnum: "Lining Figures",
  locl: "Localized Forms",
  ltra: "Left-to-right Alternates",
  ltrm: "Left-to-right Mirrored Forms",
  mark: "Mark Positioning",
  med2: "Medial Forms #2",
  medi: "Medial Forms",
  mgrk: "Mathematical Greek",
  mkmk: "Mark to Mark Positioning",
  mset: "Mark Positioning via Substitution",
  nalt: "Alternate Annotation Forms",
  nlck: "NLC Kanji Forms",
  nukt: "Nukta Forms",
  numr: "Numerators",
  onum: "Oldstyle Figures",
  opbd: "Optical Bounds",
  ordn: "Ordinals",
  ornm: "Ornaments",
  palt: "Proportional Alternate Widths",
  pcap: "Petite Capitals",
  pkna: "Proportional Kana",
  pnum: "Proportional Figures",
  pref: "Pre-base Forms",
  pres: "Pre-base Substitutions",
  pstf: "Post-base Forms",
  psts: "Post-base Substitutions",
  pwid: "Proportional Widths",
  qwid: "Quarter Widths",
  rand: "Randomize",
  rclt: "Required Contextual Alternates",
  rkrf: "Rakar Forms",
  rlig: "Required Ligatures",
  rphf: "Reph Form",
  rtbd: "Right Bounds",
  rtla: "Right-to-left Alternates",
  rtlm: "Right-to-left Mirrored Forms",
  ruby: "Ruby Notation Forms",
  rvrn: "Required Variation Alternates",
  salt: "Stylistic Alternates",
  sinf: "Scientific Inferiors",
  size: "Optical Size",
  smcp: "Small Capitals",
  smpl: "Simplified Forms",
  ssty: "Math Script-style Alternates",
  stch: "Stretching Glyph Decomposition",
  subs: "Subscript",
  sups: "Superscript",
  swsh: "Swash",
  titl: "Titling",
  tjmo: "Trailing Jamo Forms",
  tnam: "Traditional Name Forms",
  tnum: "Tabular Figures",
  trad: "Traditional Forms",
  twid: "Third Widths",
  unic: "Unicase",
  valt: "Alternate Vertical Metrics",
  vapk: "Kerning for Alternate Proportional Vertical Metrics",
  vatu: "Vattu Variants",
  vchw: "Vertical Contextual Half-width Spacing",
  vert: "Vertical Alternates",
  vhal: "Alternate Vertical Half Metrics",
  vjmo: "Vowel Jamo Forms",
  vkna: "Vertical Kana Alternates",
  vkrn: "Vertical Kerning",
  vpal: "Proportional Alternate Vertical Metrics",
  vrt2: "Vertical Alternates and Rotation",
  vrtr: "Vertical Alternates for Rotation",
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

// --- Feature grouping -------------------------------------------------------
// The features panel groups tags by what they do, not by how many fonts have
// them. Group order below is the display order; within a group, pills stay
// count-sorted (see Section).

export type FeatureGroupId =
  | "ligatures"
  | "alternates"
  | "stylisticSets"
  | "characterVariants"
  | "letterCase"
  | "numerals"
  | "positioning"
  | "shaping"
  | "cjk"
  | "other";

export const FEATURE_GROUPS: { id: FeatureGroupId; title: string }[] = [
  { id: "ligatures", title: "Ligatures" },
  { id: "alternates", title: "Alternates" },
  { id: "stylisticSets", title: "Stylistic sets" },
  { id: "characterVariants", title: "Character variants" },
  { id: "letterCase", title: "Letter case" },
  { id: "numerals", title: "Numerals" },
  { id: "positioning", title: "Positioning & kerning" },
  { id: "shaping", title: "Script shaping" },
  { id: "cjk", title: "CJK & vertical" },
  { id: "other", title: "Other" },
];

// Explicit tag -> group. ss##/cv## are matched by pattern instead (there are
// 20 and 81 of them in the catalog). Anything unlisted falls to "other", which
// is where the unregistered tags live (zz01–zz52, APLF, a broken 3-letter
// "lig", …) — 64 of the catalog's 272 tags, so the bucket cannot be dropped.
const FEATURE_GROUP_OF: Record<string, FeatureGroupId> = {
  // Ligatures
  liga: "ligatures",
  clig: "ligatures",
  dlig: "ligatures",
  hlig: "ligatures",
  rlig: "ligatures",
  slig: "ligatures",
  // Alternates
  aalt: "alternates",
  salt: "alternates",
  calt: "alternates",
  rclt: "alternates",
  nalt: "alternates",
  jalt: "alternates",
  swsh: "alternates",
  cswh: "alternates",
  hist: "alternates",
  titl: "alternates",
  ornm: "alternates",
  falt: "alternates",
  // Letter case
  smcp: "letterCase",
  c2sc: "letterCase",
  pcap: "letterCase",
  c2pc: "letterCase",
  case: "letterCase",
  cpsp: "letterCase",
  unic: "letterCase",
  // Numerals
  lnum: "numerals",
  onum: "numerals",
  tnum: "numerals",
  pnum: "numerals",
  zero: "numerals",
  frac: "numerals",
  afrc: "numerals",
  numr: "numerals",
  dnom: "numerals",
  sups: "numerals",
  subs: "numerals",
  sinf: "numerals",
  ordn: "numerals",
  // Positioning & kerning
  kern: "positioning",
  vkrn: "positioning",
  mark: "positioning",
  mkmk: "positioning",
  curs: "positioning",
  dist: "positioning",
  palt: "positioning",
  halt: "positioning",
  vpal: "positioning",
  vhal: "positioning",
  opbd: "positioning",
  lfbd: "positioning",
  rtbd: "positioning",
  // Script shaping
  ccmp: "shaping",
  locl: "shaping",
  init: "shaping",
  medi: "shaping",
  fina: "shaping",
  isol: "shaping",
  akhn: "shaping",
  rphf: "shaping",
  blwf: "shaping",
  pstf: "shaping",
  half: "shaping",
  pres: "shaping",
  abvs: "shaping",
  blws: "shaping",
  psts: "shaping",
  abvm: "shaping",
  blwm: "shaping",
  abvf: "shaping",
  cjct: "shaping",
  nukt: "shaping",
  rkrf: "shaping",
  vatu: "shaping",
  pref: "shaping",
  haln: "shaping",
  ljmo: "shaping",
  tjmo: "shaping",
  vjmo: "shaping",
  fin2: "shaping",
  fin3: "shaping",
  med2: "shaping",
  ltrm: "shaping",
  rtlm: "shaping",
  rtla: "shaping",
  stch: "shaping",
  dtls: "shaping",
  flac: "shaping",
  ssty: "shaping",
  mgrk: "shaping",
  ruby: "shaping",
  // CJK & vertical
  vert: "cjk",
  vrt2: "cjk",
  fwid: "cjk",
  hwid: "cjk",
  twid: "cjk",
  qwid: "cjk",
  pwid: "cjk",
  vkna: "cjk",
  hkna: "cjk",
  jp78: "cjk",
  jp83: "cjk",
  jp90: "cjk",
  jp04: "cjk",
  nlck: "cjk",
  expt: "cjk",
  hojo: "cjk",
  trad: "cjk",
  smpl: "cjk",
  chws: "cjk",
  vchw: "cjk",
  ital: "cjk",
};

/** Which section a feature tag belongs to. */
export function featureGroupOf(tag: string): FeatureGroupId {
  if (/^ss\d\d$/.test(tag)) return "stylisticSets";
  if (/^cv\d\d$/.test(tag)) return "characterVariants";
  return FEATURE_GROUP_OF[tag] ?? "other";
}

/**
 * Bucket [tag, count] pairs into the display groups, preserving the incoming
 * order (count-sorted) within each. Empty groups are dropped.
 */
export function groupFeatures(
  features: [string, number][]
): { id: FeatureGroupId; title: string; items: [string, number][] }[] {
  const byGroup = new Map<FeatureGroupId, [string, number][]>();
  for (const entry of features) {
    const id = featureGroupOf(entry[0]);
    const bucket = byGroup.get(id);
    if (bucket) bucket.push(entry);
    else byGroup.set(id, [entry]);
  }
  return FEATURE_GROUPS.flatMap(({ id, title }) => {
    const items = byGroup.get(id);
    return items ? [{ id, title, items }] : [];
  });
}
