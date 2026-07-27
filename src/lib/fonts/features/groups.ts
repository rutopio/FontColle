// Feature grouping for the filter panel: tags bucket by what they do, not by
// how many fonts have them. Order below is display order; within a group, pills
// stay count-sorted (see Section).

export type FeatureGroupId =
  | "ligatures"
  | "alternates"
  | "stylisticSets"
  | "characterVariants"
  | "letterCase"
  | "numerals"
  | "positioning"
  | "shapingGeneral"
  | "shapingIndic"
  | "shapingKorean"
  | "shapingArabic"
  | "shapingMath"
  | "cjk"
  | "vertical"
  | "other";

// `topN` caps how many pills a group shows up front, by font count; the rest
// collapse behind its "N more" expander (a selected pill always shows). Omit it
// to render the whole group, right for the small, wholly useful ones.
export const FEATURE_GROUPS: {
  id: FeatureGroupId;
  title: string;
  topN?: number;
}[] = [
  { id: "ligatures", title: "Ligatures" },
  { id: "alternates", title: "Alternates", topN: 9 },
  { id: "letterCase", title: "Letter case" },
  { id: "numerals", title: "Numerals" },
  { id: "positioning", title: "Positioning & kerning" },
  { id: "shapingGeneral", title: "Script shaping: General" },
  { id: "shapingIndic", title: "Script shaping: Indic", topN: 12 },
  { id: "shapingKorean", title: "Script shaping: Korean" },
  { id: "shapingArabic", title: "Script shaping: Arabic" },
  { id: "shapingMath", title: "Script shaping: Math" },
  { id: "cjk", title: "CJK", topN: 12 },
  { id: "vertical", title: "Vertical" },
  { id: "stylisticSets", title: "Stylistic sets" },
  { id: "characterVariants", title: "Character variants", topN: 15 },
  { id: "other", title: "Private & other", topN: 3 },
];

// Explicit tag -> group; ss##/cv## match by pattern instead. Anything unlisted
// falls to "other", where the private/reserved tags live (zz01–zz52, the
// uppercase vendor tags, …) — 62 of the catalog's 272 tags, so that bucket
// cannot be dropped.
const FEATURE_GROUP_OF: Record<string, FeatureGroupId> = {
  liga: "ligatures",
  clig: "ligatures",
  dlig: "ligatures",
  hlig: "ligatures",
  rlig: "ligatures",
  slig: "ligatures",
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
  smcp: "letterCase",
  c2sc: "letterCase",
  pcap: "letterCase",
  c2pc: "letterCase",
  case: "letterCase",
  cpsp: "letterCase",
  unic: "letterCase",
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
  crcy: "numerals", // currency symbols, alongside zero/frac/ordn
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
  // Script-agnostic shaping: ccmp/locl apply anywhere, and the cursive-join
  // quartet plus rvrn are shared machinery, not tied to one writing system.
  rvrn: "shapingGeneral",
  ccmp: "shapingGeneral",
  locl: "shapingGeneral",
  init: "shapingGeneral",
  medi: "shapingGeneral",
  fina: "shapingGeneral",
  isol: "shapingGeneral",
  // The Brahmic shaping engine's reordering/conjunct features.
  akhn: "shapingIndic",
  rphf: "shapingIndic",
  blwf: "shapingIndic",
  pstf: "shapingIndic",
  half: "shapingIndic",
  pres: "shapingIndic",
  abvs: "shapingIndic",
  blws: "shapingIndic",
  psts: "shapingIndic",
  abvm: "shapingIndic",
  blwm: "shapingIndic",
  abvf: "shapingIndic",
  cjct: "shapingIndic",
  nukt: "shapingIndic",
  rkrf: "shapingIndic",
  vatu: "shapingIndic",
  pref: "shapingIndic",
  haln: "shapingIndic",
  // Hangul jamo composition.
  ljmo: "shapingKorean",
  tjmo: "shapingKorean",
  vjmo: "shapingKorean",
  // Syriac forms, bidi mirroring, Syriac stretching.
  fin2: "shapingArabic",
  fin3: "shapingArabic",
  med2: "shapingArabic",
  ltrm: "shapingArabic",
  rtlm: "shapingArabic",
  rtla: "shapingArabic",
  stch: "shapingArabic",
  // Math-mode script styles, flattened accents, dotless.
  dtls: "shapingMath",
  flac: "shapingMath",
  ssty: "shapingMath",
  mgrk: "shapingMath",
  // CJK: widths, JIS/kanji form variants, simplified/traditional, ruby. hkna is
  // the horizontal kana pair; its vertical partner vkna sits in "vertical".
  ruby: "cjk",
  fwid: "cjk",
  hwid: "cjk",
  twid: "cjk",
  qwid: "cjk",
  pwid: "cjk",
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
  ital: "cjk",
  // Only apply when text is set top-to-bottom.
  vert: "vertical",
  vrt2: "vertical",
  vkna: "vertical",
  vchw: "vertical",
};

export function featureGroupOf(tag: string): FeatureGroupId {
  if (/^ss\d\d$/.test(tag)) return "stylisticSets";
  if (/^cv\d\d$/.test(tag)) return "characterVariants";
  return FEATURE_GROUP_OF[tag] ?? "other";
}

export interface FeatureGroup {
  id: FeatureGroupId;
  title: string;
  items: [string, number][];
  /** Every tag when `topN` is unset. */
  topNSet: Set<string>;
}

/**
 * Buckets [tag, count] pairs into the display groups, preserving incoming order
 * within each and dropping empty groups.
 *
 * `topNSet` comes from font count, never from `features`' order: flipping the
 * panel to A–Z must reorder the pills, not change which ones hide. A group with
 * no `topN` gets all its tags, so Pills shows them all rather than falling back
 * to its own rarity threshold.
 */
export function groupFeatures(features: [string, number][]): FeatureGroup[] {
  const byGroup = new Map<FeatureGroupId, [string, number][]>();
  for (const entry of features) {
    const id = featureGroupOf(entry[0]);
    const bucket = byGroup.get(id);
    if (bucket) bucket.push(entry);
    else byGroup.set(id, [entry]);
  }
  return FEATURE_GROUPS.flatMap(({ id, title, topN }) => {
    const items = byGroup.get(id);
    if (!items) return [];
    const shown =
      topN == null
        ? items
        : [...items].sort((a, b) => b[1] - a[1]).slice(0, topN);
    return [{ id, title, items, topNSet: new Set(shown.map(([tag]) => tag)) }];
  });
}
