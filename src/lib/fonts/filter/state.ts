// Filters live in the URL, so they survive list <-> detail navigation and the
// detail sidebar can link back with a filter applied.
import type { MetricKey, MetricRange } from "@/lib/fonts/metrics";
import { classificationGroupOf } from "./facets";
import { INSTANCE_MAX, INSTANCE_MIN, type InstanceRange } from "./instances";
import {
  type MatchMode,
  MODE_KEYS,
  type ModeKey,
  SECTION_DEFAULT_MODE,
} from "./match-mode";

export interface FilterState {
  query: string;
  categories: string[]; // primary category, OR within
  tags: string[]; // font type, radio-style: 0 or 1 of "static" | "variable"
  features: string[]; // OpenType feature tags, AND across
  axes: string[]; // axis tags, AND across
  weights: string[]; // standard weight steps ("100".."900"), OR within
  widths: string[]; // usWidthClass steps ("1".."9"), OR within
  scripts: string[]; // writing-system codes ("Latn"…), AND across
  languages: string[]; // language ids ("en_Latn"…), AND across
  color: string[]; // "color" | "monochrome", radio-style
  colorFormats: string[]; // "COLR", "SVG", …, AND across (a font can carry both)
  style: string[]; // classification tag paths ("/Serif/Didone", …), OR within
  designers: string[]; // comma-split designer names, OR within
  vendors: string[]; // folded OS/2 achVendID, OR within
  license: string[]; // license ids ("OFL", "APACHE2", "UFL"), OR within
  repoHosts: string[]; // "github" | "gitlab" | "sourcehut" | "none", OR within
  activity: string[]; // "latest" | "active" | "recent" | "dormant", OR within
  flags: string[]; // Noto membership, radio-style
  italic: string[]; // "italic" | "upright", radio-style
  upm: string[]; // units-per-em values ("1000", "2048"…), OR within
  // Absent means "any"; only stored while it narrows the domain, like metrics.
  instances?: InstanceRange;
  // AND across. Only active ranges (a thumb off its domain edge) are present;
  // an absent key filters nothing. See ../metrics for the derivations.
  metrics: Partial<Record<MetricKey, MetricRange>>;
  hasHinting?: boolean; // undefined = off, not a filter
  // Per-section OR/AND override. Only sections differing from their default
  // appear, so shared URLs keep their original combine behaviour.
  matchModes: Partial<Record<ModeKey, MatchMode>>;
}

// Bundled so the grid passes one object rather than six loose arrays.
export type FilterSelection = Pick<
  FilterState,
  "categories" | "tags" | "color" | "axes" | "weights" | "widths" | "italic"
>;

export const emptyFilter: FilterState = {
  query: "",
  categories: [],
  tags: [],
  features: [],
  axes: [],
  weights: [],
  widths: [],
  scripts: [],
  languages: [],
  color: [],
  colorFormats: [],
  style: [],
  designers: [],
  vendors: [],
  license: [],
  repoHosts: [],
  activity: [],
  flags: [],
  italic: [],
  upm: [],
  metrics: {},
  matchModes: {},
};

// The only values `tags` holds, surfaced as the Variant panel's Font type radio.
export const FONT_TYPE_FACETS = ["static", "variable"];

// Param names track the field's meaning, so a shared URL reads plainly:
// ?category=Sans&style=Serif.Transitional.
export interface FilterSearch {
  q?: string;
  category?: string; // primary class ("Serif", "Sans", …), the Category cards
  // Named `tag` because the retired Tag panel wrote the whole facet list here.
  // Kept so links shared before its removal still decode.
  tag?: string;
  feature?: string; // OpenType feature tags
  axis?: string; // variable-axis tags
  weight?: string;
  width?: string;
  script?: string;
  lang?: string;
  color?: string;
  colorformat?: string; // color-table formats ("COLR", "SVG", …)
  // The single `style` state splits across two params by rail group, so the URL
  // matches the panels.
  style?: string; // form classifications (Serif / Sans / Script …)
  mood?: string; // feel classifications (Expressive / Theme / Seasonal)
  designer?: string; // designer names, comma-joined
  vendor?: string; // vendor ids (folded), "_"-joined
  license?: string; // license ids
  repo?: string; // repository host buckets
  activity?: string; // activity buckets: "latest" | "active" | "recent" | "dormant"
  // "noto" | "non-noto", tracking the pill labels; "non-noto" maps to the
  // internal flag value "others" (see encodeSource/decodeSource).
  noto?: string;
  italic?: string; // italic radio: "italic" | "upright"
  upm?: string; // units-per-em values
  // "lo-hi" bounds, never a bucket id: the slider can land on any range.
  instances?: string;
  xheight?: string; // x-height ratio
  capheight?: string; // cap-height ratio
  lineheight?: string; // line-height ratio
  avgwidth?: string; // avg width ratio
  contrast?: string; // contrast ratio
  filesize?: string; // file size (raw bytes)
  hinting?: string; // "hinted" | "unhinted" (radio-style, like `italic`)
  mode?: string;
  sort?: string; // sort key, not a filter (view mode lives in localStorage)
  fav?: string; // "1" = show only hearted fonts; a view mode, not a filter
}

const splitCsv = (v: string | undefined): string[] =>
  v ? v.split(",").filter(Boolean) : [];

// "," encodes to %2C, so lists join with "_", which URLSearchParams leaves
// literal: ?class=Emoji_Script_Slab. `designer` and `lang` keep the comma,
// since their values already contain "_" or ".". Decode accepts either.
const joinUnderscore = (xs: string[]): string => xs.join("_");

const splitUnderscore = (v: string | undefined): string[] => {
  if (!v) return [];
  const sep = v.includes(",") ? "," : "_";
  return v.split(sep).filter(Boolean);
};

// Tag paths would percent-encode on both the "," and the inner "/". Every path
// is exactly "/Section/Subtag", with no "." or "_" in either segment, so
// dropping the leading "/" and writing the inner one as "." is lossless:
// ?style=Serif.Didone_Sans.Humanist.
const encodeClasses = (paths: string[]): string =>
  paths.map((p) => p.replace(/^\//, "").replace(/\//g, ".")).join("_");

const decodeClasses = (v: string | undefined): string[] => {
  if (!v) return [];
  // A raw slash means someone hand-typed the "/Section/Subtag" form.
  if (v.includes("/")) return v.split(",").filter(Boolean);
  return v
    .split("_")
    .filter(Boolean)
    .map((seg) => `/${seg.replace(/\./g, "/")}`);
};

// One `style` array, two URL params. A path whose prefix matches no section
// falls back to `style` so it never silently vanishes.
function encodeClassifications(paths: string[], s: FilterSearch): void {
  const style = paths.filter((p) => classificationGroupOf(p) !== "mood");
  const mood = paths.filter((p) => classificationGroupOf(p) === "mood");
  if (style.length) s.style = encodeClasses(style);
  if (mood.length) s.mood = encodeClasses(mood);
}

function decodeClassifications(s: FilterSearch): string[] {
  return [...decodeClasses(s.style), ...decodeClasses(s.mood)];
}

// The internal flag value is "others"; the URL spells it "non-noto" to match
// the pill. An unknown token falls through unchanged.
const encodeSource = (v: string): string => (v === "others" ? "non-noto" : v);
const decodeSource = (v: string): string => (v === "non-noto" ? "others" : v);

// "lo-hi". Negatives never occur in these domains, so "-" is a safe separator.
type MetricParam =
  | "xheight"
  | "capheight"
  | "lineheight"
  | "avgwidth"
  | "contrast"
  | "filesize";
const METRIC_PARAM: Record<MetricKey, MetricParam> = {
  xHeight: "xheight",
  capHeight: "capheight",
  lineHeight: "lineheight",
  avgWidth: "avgwidth",
  contrast: "contrast",
  fileSize: "filesize",
};

const parseRange = (v: string | undefined): MetricRange | undefined => {
  if (!v) return undefined;
  const [lo, hi] = v.split("-");
  // Number("") is 0, so an empty part (truncated range like "0.4-") must be
  // rejected explicitly rather than silently decoding to 0.
  const n = (s: string | undefined) => (s ? Number(s) : Number.NaN);
  const l = n(lo);
  const h = n(hi);
  return Number.isFinite(l) && Number.isFinite(h) ? [l, h] : undefined;
};

function decodeMetrics(s: FilterSearch): FilterState["metrics"] {
  const out: FilterState["metrics"] = {};
  for (const key of Object.keys(METRIC_PARAM) as MetricKey[]) {
    const r = parseRange(s[METRIC_PARAM[key]]);
    if (r) out[key] = r;
  }
  return out;
}

// Bounds are clamped and ordered, so a hand-typed ?instances=99-2 still lands
// sanely; a range covering the whole domain filters nothing and is dropped.
function decodeInstances(v: string | undefined): InstanceRange | undefined {
  const r = parseRange(v);
  if (!r) return undefined;
  // Named `clampToDomain`, not `fit`: biome reads a bare `fit(` as vitest's
  // focused-test helper and flags the whole function.
  const clampToDomain = (n: number) =>
    Math.min(INSTANCE_MAX, Math.max(INSTANCE_MIN, Math.round(n)));
  const lo = Math.min(clampToDomain(r[0]), clampToDomain(r[1]));
  const hi = Math.max(clampToDomain(r[0]), clampToDomain(r[1]));
  if (lo <= INSTANCE_MIN && hi >= INSTANCE_MAX) return undefined;
  return [lo, hi];
}

function encodeMetrics(metrics: FilterState["metrics"], s: FilterSearch): void {
  for (const key of Object.keys(METRIC_PARAM) as MetricKey[]) {
    const r = metrics[key];
    if (r) s[METRIC_PARAM[key]] = `${r[0]}-${r[1]}`;
  }
}

// "key:mode" pairs. A mode equal to the section default is dropped, so the
// object stays minimal.
const MODE_KEY_SET = new Set<string>(MODE_KEYS);

function decodeModes(v: string | undefined): FilterState["matchModes"] {
  const out: FilterState["matchModes"] = {};
  if (!v) return out;
  for (const pair of v.split(",")) {
    const [key, mode] = pair.split(":");
    if (!MODE_KEY_SET.has(key)) continue;
    if (mode !== "any" && mode !== "all") continue;
    const k = key as ModeKey;
    if (mode !== SECTION_DEFAULT_MODE[k]) out[k] = mode;
  }
  return out;
}

function encodeModes(modes: FilterState["matchModes"]): string | undefined {
  const parts = MODE_KEYS.flatMap((k) => {
    const m = modes[k];
    return m && m !== SECTION_DEFAULT_MODE[k] ? [`${k}:${m}`] : [];
  });
  return parts.length ? parts.join(",") : undefined;
}

export function searchToFilter(s: FilterSearch): FilterState {
  return {
    query: s.q ?? "",
    categories: splitUnderscore(s.category),
    tags: splitUnderscore(s.tag),
    features: splitUnderscore(s.feature),
    axes: splitUnderscore(s.axis),
    weights: splitUnderscore(s.weight),
    widths: splitUnderscore(s.width),
    scripts: splitUnderscore(s.script),
    languages: splitCsv(s.lang),
    color: splitUnderscore(s.color),
    colorFormats: splitUnderscore(s.colorformat),
    style: decodeClassifications(s),
    designers: splitCsv(s.designer),
    vendors: splitUnderscore(s.vendor),
    license: splitUnderscore(s.license),
    repoHosts: splitUnderscore(s.repo),
    activity: splitUnderscore(s.activity),
    flags: splitUnderscore(s.noto).map(decodeSource),
    italic: splitUnderscore(s.italic),
    upm: splitUnderscore(s.upm),
    instances: decodeInstances(s.instances),
    metrics: decodeMetrics(s),
    hasHinting:
      s.hinting === "hinted"
        ? true
        : s.hinting === "unhinted"
          ? false
          : undefined,
    matchModes: decodeModes(s.mode),
  };
}

export function filterToSearch(f: FilterState): FilterSearch {
  const s: FilterSearch = {};
  if (f.query) s.q = f.query;
  if (f.categories.length) s.category = joinUnderscore(f.categories);
  if (f.tags.length) s.tag = joinUnderscore(f.tags);
  if (f.features.length) s.feature = joinUnderscore(f.features);
  if (f.axes.length) s.axis = joinUnderscore(f.axes);
  if (f.weights.length) s.weight = joinUnderscore(f.weights);
  if (f.widths.length) s.width = joinUnderscore(f.widths);
  if (f.scripts.length) s.script = joinUnderscore(f.scripts);
  if (f.languages.length) s.lang = f.languages.join(",");
  if (f.color.length) s.color = joinUnderscore(f.color);
  if (f.colorFormats.length) s.colorformat = joinUnderscore(f.colorFormats);
  if (f.style.length) encodeClassifications(f.style, s);
  if (f.designers.length) s.designer = f.designers.join(",");
  if (f.vendors.length) s.vendor = joinUnderscore(f.vendors);
  if (f.license.length) s.license = joinUnderscore(f.license);
  if (f.repoHosts.length) s.repo = joinUnderscore(f.repoHosts);
  if (f.activity.length) s.activity = joinUnderscore(f.activity);
  if (f.flags.length) s.noto = joinUnderscore(f.flags.map(encodeSource));
  if (f.italic.length) s.italic = joinUnderscore(f.italic);
  if (f.upm.length) s.upm = joinUnderscore(f.upm);
  // A full-domain range filters nothing, so it never reaches the URL.
  if (
    f.instances &&
    (f.instances[0] > INSTANCE_MIN || f.instances[1] < INSTANCE_MAX)
  )
    s.instances = `${f.instances[0]}-${f.instances[1]}`;
  encodeMetrics(f.metrics, s);
  if (f.hasHinting !== undefined)
    s.hinting = f.hasHinting ? "hinted" : "unhinted";
  const mode = encodeModes(f.matchModes);
  if (mode) s.mode = mode;
  return s;
}

/** Excludes the text query, which has its own input. */
export function activeFilterCount(f: FilterState): number {
  return (
    f.categories.length +
    f.tags.length +
    f.features.length +
    f.axes.length +
    f.weights.length +
    f.widths.length +
    f.scripts.length +
    f.languages.length +
    f.color.length +
    f.colorFormats.length +
    f.style.length +
    f.designers.length +
    f.vendors.length +
    f.license.length +
    f.repoHosts.length +
    f.activity.length +
    f.flags.length +
    f.italic.length +
    f.upm.length +
    (f.instances ? 1 : 0) +
    Object.keys(f.metrics).length +
    (f.hasHinting !== undefined ? 1 : 0)
  );
}

/** Drops unknown keys, so a hand-typed URL can't inject state. */
export function parseFilterSearch(raw: Record<string, unknown>): FilterSearch {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  // A single numeric value (?weight=900) arrives as a number, not a string.
  const numCsv = (v: unknown) => (typeof v === "number" ? String(v) : str(v));
  return {
    q: str(raw.q),
    category: str(raw.category),
    tag: str(raw.tag),
    axis: str(raw.axis),
    feature: str(raw.feature),
    weight: numCsv(raw.weight),
    width: numCsv(raw.width),
    script: str(raw.script),
    lang: str(raw.lang),
    color: str(raw.color),
    colorformat: str(raw.colorformat),
    style: str(raw.style),
    mood: str(raw.mood),
    designer: str(raw.designer),
    vendor: str(raw.vendor),
    license: str(raw.license),
    repo: str(raw.repo),
    activity: str(raw.activity),
    noto: str(raw.noto),
    italic: str(raw.italic),
    upm: numCsv(raw.upm),
    instances: numCsv(raw.instances),
    xheight: str(raw.xheight),
    capheight: str(raw.capheight),
    lineheight: str(raw.lineheight),
    avgwidth: str(raw.avgwidth),
    contrast: str(raw.contrast),
    filesize: str(raw.filesize),
    hinting: str(raw.hinting),
    mode: str(raw.mode),
    sort: str(raw.sort),
    fav: str(raw.fav),
  };
}
