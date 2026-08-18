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

const FEATURE_GROUPS: {
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
  crcy: "numerals",
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
  rvrn: "shapingGeneral",
  ccmp: "shapingGeneral",
  locl: "shapingGeneral",
  init: "shapingGeneral",
  medi: "shapingGeneral",
  fina: "shapingGeneral",
  isol: "shapingGeneral",
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
  ljmo: "shapingKorean",
  tjmo: "shapingKorean",
  vjmo: "shapingKorean",
  fin2: "shapingArabic",
  fin3: "shapingArabic",
  med2: "shapingArabic",
  ltrm: "shapingArabic",
  rtlm: "shapingArabic",
  rtla: "shapingArabic",
  stch: "shapingArabic",
  dtls: "shapingMath",
  flac: "shapingMath",
  ssty: "shapingMath",
  mgrk: "shapingMath",
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
  vert: "vertical",
  vrt2: "vertical",
  vkna: "vertical",
  vchw: "vertical",
};

function featureGroupOf(tag: string): FeatureGroupId {
  if (/^ss\d\d$/.test(tag)) return "stylisticSets";
  if (/^cv\d\d$/.test(tag)) return "characterVariants";
  return FEATURE_GROUP_OF[tag] ?? "other";
}

export interface FeatureGroup {
  id: FeatureGroupId;
  title: string;
  items: [string, number][];
  topNSet: Set<string>;
}

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
