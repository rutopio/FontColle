// Filter state shape, its empty value, and the URL <-> state codec. Filters
// live in the URL so they persist across list <-> detail navigation and the
// detail sidebar can link back to the list with a filter applied.
import type { MetricKey, MetricRange } from "@/lib/fonts/metrics";
import { classificationGroupOf } from "./facets";
import {
  type MatchMode,
  MODE_KEYS,
  type ModeKey,
  SECTION_DEFAULT_MODE,
} from "./match-mode";

export interface FilterState {
  query: string;
  classes: string[]; // primary class, OR within
  facets: string[]; // facet tags, AND across
  features: string[]; // OpenType feature tags, AND across
  axes: string[]; // axis tags, AND across
  weights: string[]; // standard weight steps ("100".."900"), OR within
  widths: string[]; // usWidthClass steps ("1".."9"), OR within
  scripts: string[]; // writing-system codes ("Latn"…), AND across
  languages: string[]; // language ids ("en_Latn"…), AND across
  color: string[]; // "color" | "monochrome", at most one (radio-style)
  // Color-table formats ("COLR", "SVG", …), AND across: a font carrying both
  // COLR and SVG matches when both are selected. Counts therefore overlap.
  colorFormats: string[];
  // Google Fonts classification tag paths ("/Serif/Didone", …), OR within: a
  // font matches when any selected tag scores tags[path] >= 50.
  classifications: string[];
  // Designer names, OR within: a family matches when any of its (comma-split)
  // designers is selected. Vendor is the folded OS/2 achVendID, also OR within.
  designers: string[];
  vendors: string[];
  license: string[]; // license ids ("OFL", "APACHE2", "UFL"), OR within
  // Repository host buckets ("github","gitlab","sourcehut","none"), OR within.
  repoHosts: string[];
  // Maintenance-activity buckets ("latest","active","recent","dormant"),
  // radio-style (at most one; they partition the catalog).
  activity: string[];
  // Source: radio-style Noto / Others, stored as a 0- or 1-length array.
  flags: string[];
  // Italic: radio-style, stored as a 0- or 1-length array. "italic" = family
  // offers an italic style (carries the has-italic facet), "upright" = it does
  // not. The two partition the whole catalog.
  italic: string[];
  upm: string[]; // units-per-em values ("1000", "2048"…), OR within
  // Derived-metric range sliders (x-height ratio, file size, …), AND across.
  // Only active ranges (a thumb off its domain edge) are present; an absent key
  // filters nothing. See ../metrics for the derivations and domains.
  metrics: Partial<Record<MetricKey, MetricRange>>;
  // Hinting trait, a radio-style pair. true = Hinted, false = No Hinted,
  // undefined = off (no filter).
  hasHinting?: boolean;
  // Per-section OR/AND override. Only sections whose mode differs from their
  // default appear here, so a pristine filter has an empty object and existing
  // shared URLs keep their original combine behaviour. See ./match-mode.
  matchModes: Partial<Record<ModeKey, MatchMode>>;
}

// The slice of the filter a preview (card/row) needs to know about, to both
// drive the live preview and highlight the trait badges that match. Bundled so
// the grid passes one object instead of six loose arrays.
export type FilterSelection = Pick<
  FilterState,
  "classes" | "facets" | "color" | "axes" | "weights" | "widths" | "italic"
>;

export const emptyFilter: FilterState = {
  query: "",
  classes: [],
  facets: [],
  features: [],
  axes: [],
  weights: [],
  widths: [],
  scripts: [],
  languages: [],
  color: [],
  colorFormats: [],
  classifications: [],
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

// The two `facets` values that say whether a family is a variable font. They
// live in `facets` like any other tag, but the UI surfaces them as their own
// radio pair (Axes > Font type) rather than as pills in Tag, so
// buildFacetIndex keeps them out of the `facets` list it emits.
export const FONT_TYPE_FACETS = ["static", "variable"];

// URL search-param shape. Param names track the field's meaning (and, where a
// UI section owns exactly one field, its section title) so a shared URL reads
// plainly: ?category=Sans&style=Serif.Transitional. Arrays are comma-joined;
// empty keys are omitted.
export interface FilterSearch {
  q?: string;
  category?: string; // primary class ("Serif", "Sans", …), the Category cards
  tag?: string; // trait facet tags, "_"-joined
  feature?: string; // OpenType feature tags
  axis?: string; // variable-axis tags
  weight?: string;
  width?: string;
  script?: string;
  lang?: string;
  color?: string;
  colorformat?: string; // color-table formats ("COLR", "SVG", …)
  // Classification tag paths, "Section.Subtag"-joined by "_". The single
  // `classifications` state splits across two params by rail group so the URL
  // matches the panels: form sections -> `style`, feel sections -> `mood`.
  style?: string; // form classifications (Serif / Sans / Script …)
  mood?: string; // feel classifications (Expressive / Theme / Seasonal)
  designer?: string; // designer names, comma-joined
  vendor?: string; // vendor ids (folded), "_"-joined
  license?: string; // license ids
  repo?: string; // repository host buckets
  activity?: string; // activity radio: "latest" | "active" | "recent" | "dormant"
  // Noto-membership radio. The URL value tracks the section's pill labels
  // ("noto" | "non-noto"); the "non-noto" spelling maps to the internal flag
  // value "others" (see encodeSource/decodeSource).
  noto?: string;
  italic?: string; // italic radio: "italic" | "upright"
  upm?: string; // units-per-em values
  // Metric ranges, each "lo-hi" (e.g. xheight=0.45-0.55). One key per metric.
  xheight?: string; // x-height ratio
  capheight?: string; // cap-height ratio
  lineheight?: string; // line-height ratio
  avgwidth?: string; // avg width ratio
  contrast?: string; // contrast ratio
  filesize?: string; // file size (raw bytes)
  hinting?: string; // "hinted" | "unhinted" (radio-style, like `italic`)
  // Non-default section modes, comma-joined "key:mode" (e.g. "facets:any").
  mode?: string;
  sort?: string; // sort key, not a filter (view mode lives in localStorage)
  fav?: string; // "1" = show only hearted fonts; a view mode, not a filter
}

const splitCsv = (v: string | undefined): string[] =>
  v ? v.split(",").filter(Boolean) : [];

// Most list params comma-join, but "," is a URL sub-delimiter that encodes to
// %2C, so a multi-select reads as ?class=Emoji%2CScript%2CSlab. For params whose
// value domain never contains "_" (class, facet, weight, script, …) we join with
// "_" instead, which URLSearchParams leaves literal: ?class=Emoji_Script_Slab.
// Two params keep the comma because their values already contain the alternates:
// `dsr` (designer names carry "," and ".") and `lang` (ids are "en_Latn", full of
// "_"). Decode accepts either separator so links shared before this change, and
// the always-comma dsr/lang, still parse.
const joinUnderscore = (xs: string[]): string => xs.join("_");

const splitUnderscore = (v: string | undefined): string[] => {
  if (!v) return [];
  // Legacy links (and any hand-typed URL) use commas; honour them.
  const sep = v.includes(",") ? "," : "_";
  return v.split(sep).filter(Boolean);
};

// The `style`/`mood` params carry classification tag paths ("/Serif/Didone", …).
// Comma-joining them like every other list makes an unreadable URL, because both
// the "," between entries and the "/" inside each path percent-encode
// (?style=%2FSerif%2FDidone%2C…). Every path is exactly "/Section/Subtag" (no
// path has three segments and no segment contains "." or "_"), so a friendlier
// lossless form is to drop the leading "/", write the inner "/" as ".", and join
// entries with "_": ?style=Serif.Didone_Sans.Humanist.
const encodeClasses = (paths: string[]): string =>
  paths.map((p) => p.replace(/^\//, "").replace(/\//g, ".")).join("_");

const decodeClasses = (v: string | undefined): string[] => {
  if (!v) return [];
  // A raw slash means the caller hand-typed the "/Section/Subtag" form; split on
  // comma and keep as-is.
  if (v.includes("/")) return v.split(",").filter(Boolean);
  return v
    .split("_")
    .filter(Boolean)
    .map((seg) => `/${seg.replace(/\./g, "/")}`);
};

// classifications is one state array but two URL params: `style` (form sections)
// and `mood` (feel sections), matching the two rail panels. Split on encode by
// each path's rail group; a path whose prefix matches no section (group null)
// falls back to `style` so it never silently vanishes. Merge both params on
// decode back into the single array. Order within each param is preserved;
// across params, style entries precede mood, which is fine because
// classifications is an unordered set (OR-within by default).
function encodeClassifications(paths: string[], s: FilterSearch): void {
  const style = paths.filter((p) => classificationGroupOf(p) !== "mood");
  const mood = paths.filter((p) => classificationGroupOf(p) === "mood");
  if (style.length) s.style = encodeClasses(style);
  if (mood.length) s.mood = encodeClasses(mood);
}

function decodeClassifications(s: FilterSearch): string[] {
  return [...decodeClasses(s.style), ...decodeClasses(s.mood)];
}

// Source (Noto-membership) radio. The internal flag value is "noto" | "others";
// the URL spells the second bucket "non-noto" to match the "Non-Noto" pill. Only
// this one value is remapped, so a plain lookup each way keeps the round-trip
// lossless and leaves an unknown token to fall through unchanged.
const encodeSource = (v: string): string => (v === "others" ? "non-noto" : v);
const decodeSource = (v: string): string => (v === "non-noto" ? "others" : v);

// URL <-> metric-range codec. "lo-hi", each a plain number so the round-trip is
// lossless; negatives never occur in these domains, so "-" is a safe separator.
// The URL param name per metric. Every one is a string-valued FilterSearch key,
// so encode can assign a string to it without widening to view/sort.
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

function encodeMetrics(metrics: FilterState["metrics"], s: FilterSearch): void {
  for (const key of Object.keys(METRIC_PARAM) as MetricKey[]) {
    const r = metrics[key];
    if (r) s[METRIC_PARAM[key]] = `${r[0]}-${r[1]}`;
  }
}

// URL <-> matchModes codec. "key:mode" pairs; only keys that are real ModeKeys
// with a valid mode that differs from the section default are kept (a default
// value would be redundant and is dropped so the object stays minimal).
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
    classes: splitUnderscore(s.category),
    facets: splitUnderscore(s.tag),
    features: splitUnderscore(s.feature),
    axes: splitUnderscore(s.axis),
    weights: splitUnderscore(s.weight),
    widths: splitUnderscore(s.width),
    scripts: splitUnderscore(s.script),
    // designer and lang keep the comma: designer names contain "," and ".",
    // language ids contain "_", so neither has a safe underscore separator.
    languages: splitCsv(s.lang),
    color: splitUnderscore(s.color),
    colorFormats: splitUnderscore(s.colorformat),
    classifications: decodeClassifications(s),
    designers: splitCsv(s.designer),
    vendors: splitUnderscore(s.vendor),
    license: splitUnderscore(s.license),
    repoHosts: splitUnderscore(s.repo),
    activity: splitUnderscore(s.activity),
    flags: splitUnderscore(s.noto).map(decodeSource),
    italic: splitUnderscore(s.italic),
    upm: splitUnderscore(s.upm),
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
  if (f.classes.length) s.category = joinUnderscore(f.classes);
  if (f.facets.length) s.tag = joinUnderscore(f.facets);
  if (f.features.length) s.feature = joinUnderscore(f.features);
  if (f.axes.length) s.axis = joinUnderscore(f.axes);
  if (f.weights.length) s.weight = joinUnderscore(f.weights);
  if (f.widths.length) s.width = joinUnderscore(f.widths);
  if (f.scripts.length) s.script = joinUnderscore(f.scripts);
  // designer and lang keep the comma (see searchToFilter).
  if (f.languages.length) s.lang = f.languages.join(",");
  if (f.color.length) s.color = joinUnderscore(f.color);
  if (f.colorFormats.length) s.colorformat = joinUnderscore(f.colorFormats);
  if (f.classifications.length) encodeClassifications(f.classifications, s);
  if (f.designers.length) s.designer = f.designers.join(",");
  if (f.vendors.length) s.vendor = joinUnderscore(f.vendors);
  if (f.license.length) s.license = joinUnderscore(f.license);
  if (f.repoHosts.length) s.repo = joinUnderscore(f.repoHosts);
  if (f.activity.length) s.activity = joinUnderscore(f.activity);
  if (f.flags.length) s.noto = joinUnderscore(f.flags.map(encodeSource));
  if (f.italic.length) s.italic = joinUnderscore(f.italic);
  if (f.upm.length) s.upm = joinUnderscore(f.upm);
  encodeMetrics(f.metrics, s);
  if (f.hasHinting !== undefined)
    s.hinting = f.hasHinting ? "hinted" : "unhinted";
  const mode = encodeModes(f.matchModes);
  if (mode) s.mode = mode;
  return s;
}

/** How many filter values are active across every section (excludes the text
 *  query). Drives the "Clear N filters" affordance. */
export function activeFilterCount(f: FilterState): number {
  return (
    f.classes.length +
    f.facets.length +
    f.features.length +
    f.axes.length +
    f.weights.length +
    f.widths.length +
    f.scripts.length +
    f.languages.length +
    f.color.length +
    f.colorFormats.length +
    f.classifications.length +
    f.designers.length +
    f.vendors.length +
    f.license.length +
    f.repoHosts.length +
    f.activity.length +
    f.flags.length +
    f.italic.length +
    f.upm.length +
    Object.keys(f.metrics).length +
    (f.hasHinting !== undefined ? 1 : 0)
  );
}

/** Validate/coerce raw URL search into FilterSearch (drops unknown keys). */
export function parseFilterSearch(raw: Record<string, unknown>): FilterSearch {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  // Weight/width values are numeric, so a hand-typed ?weight=900 arrives as a
  // number and a single ?weight=700 too; coerce numbers to strings so shared
  // URLs parse the same as the pill-written "700,900".
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
