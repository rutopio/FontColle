// Feature grouping for the filter panel. The features panel groups tags by what
// they do, not by how many fonts have them. Group order below is the display
// order; within a group, pills stay count-sorted (see Section).

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

// `topN` caps how many pills a group shows up front, by font count; the rest
// collapse behind its "N more" expander (a selected pill always shows). Omit it
// to render the whole group — right for the small, wholly useful ones.
export const FEATURE_GROUPS: {
  id: FeatureGroupId;
  title: string;
  topN?: number;
}[] = [
  { id: "ligatures", title: "Ligatures" },
  { id: "alternates", title: "Alternates", topN: 9 },
  { id: "stylisticSets", title: "Stylistic sets" },
  { id: "characterVariants", title: "Character variants", topN: 15 },
  { id: "letterCase", title: "Letter case" },
  { id: "numerals", title: "Numerals" },
  { id: "positioning", title: "Positioning & kerning" },
  { id: "shaping", title: "Script shaping", topN: 30 },
  { id: "cjk", title: "CJK & vertical", topN: 12 },
  { id: "other", title: "Other", topN: 3 },
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

export interface FeatureGroup {
  id: FeatureGroupId;
  title: string;
  items: [string, number][];
  /** The tags this group shows up front. Holds every tag when `topN` is unset. */
  topNSet: Set<string>;
}

/**
 * Bucket [tag, count] pairs into the display groups, preserving the incoming
 * order within each. Empty groups are dropped.
 *
 * `topNSet` is always computed from font count, never from `features`' order —
 * flipping the panel to A–Z must reorder the pills, not change which ones the
 * group hides. A group with no `topN` gets a set of all its tags, so Pills
 * shows them all rather than falling back to its own rarity threshold.
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
