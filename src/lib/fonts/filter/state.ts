// Filter state shape, its empty value, and the URL <-> state codec. Filters
// live in the URL so they persist across list <-> detail navigation and the
// detail sidebar can link back to the list with a filter applied.
import type { MetricKey, MetricRange } from "../metrics";
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
  // Maintenance-activity buckets ("active","recent","dormant","unknown"),
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
// radio pair (Axes > Font type) rather than as pills in Properties, so
// buildFacetIndex keeps them out of the `facets` list it emits.
export const FONT_TYPE_FACETS = ["static", "variable"];

// URL search-param shape. Arrays are comma-joined; empty keys are omitted.
export interface FilterSearch {
  q?: string;
  class?: string;
  facet?: string;
  feature?: string;
  axis?: string;
  weight?: string;
  width?: string;
  script?: string;
  lang?: string;
  color?: string;
  cfmt?: string;
  cls?: string; // classification tag paths
  dsr?: string; // designer names, comma-joined
  vnd?: string; // vendor ids (folded), comma-joined
  lic?: string; // license ids
  repo?: string; // repository host buckets, comma-joined
  act?: string; // activity radio: "active" | "recent" | "dormant" | "unknown"
  flag?: string; // source radio: "noto" | "others"
  ital?: string; // italic radio: "italic" | "upright"
  upm?: string; // units-per-em values, comma-joined
  // Metric ranges, each "lo-hi" (e.g. mxh=0.45-0.55). One key per metric.
  mxh?: string; // x-height ratio
  mch?: string; // cap-height ratio
  mlh?: string; // line-height ratio
  maw?: string; // avg width ratio
  mct?: string; // contrast ratio
  mfs?: string; // file size (raw bytes)
  hint?: string; // "1" = Hinted, "0" = No Hinted
  // Non-default section modes, comma-joined "key:mode" (e.g. "facets:any").
  mode?: string;
  view?: "grid" | "row"; // display preference, not a filter
  sort?: string; // sort key, not a filter
}

const splitCsv = (v: string | undefined): string[] =>
  v ? v.split(",").filter(Boolean) : [];

// URL <-> metric-range codec. "lo-hi", each a plain number so the round-trip is
// lossless; negatives never occur in these domains, so "-" is a safe separator.
// The URL param name per metric. Every one is a string-valued FilterSearch key,
// so encode can assign a string to it without widening to view/sort.
type MetricParam = "mxh" | "mch" | "mlh" | "maw" | "mct" | "mfs";
const METRIC_PARAM: Record<MetricKey, MetricParam> = {
  xHeight: "mxh",
  capHeight: "mch",
  lineHeight: "mlh",
  avgWidth: "maw",
  contrast: "mct",
  fileSize: "mfs",
};

const parseRange = (v: string | undefined): MetricRange | undefined => {
  if (!v) return undefined;
  const [lo, hi] = v.split("-");
  const n = (s: string | undefined) => (s != null ? Number(s) : Number.NaN);
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
    classes: splitCsv(s.class),
    facets: splitCsv(s.facet),
    features: splitCsv(s.feature),
    axes: splitCsv(s.axis),
    weights: splitCsv(s.weight),
    widths: splitCsv(s.width),
    scripts: splitCsv(s.script),
    languages: splitCsv(s.lang),
    color: splitCsv(s.color),
    colorFormats: splitCsv(s.cfmt),
    classifications: splitCsv(s.cls),
    designers: splitCsv(s.dsr),
    vendors: splitCsv(s.vnd),
    license: splitCsv(s.lic),
    repoHosts: splitCsv(s.repo),
    activity: splitCsv(s.act),
    flags: splitCsv(s.flag),
    italic: splitCsv(s.ital),
    upm: splitCsv(s.upm),
    metrics: decodeMetrics(s),
    hasHinting: s.hint === "1" ? true : s.hint === "0" ? false : undefined,
    matchModes: decodeModes(s.mode),
  };
}

export function filterToSearch(f: FilterState): FilterSearch {
  const s: FilterSearch = {};
  if (f.query) s.q = f.query;
  if (f.classes.length) s.class = f.classes.join(",");
  if (f.facets.length) s.facet = f.facets.join(",");
  if (f.features.length) s.feature = f.features.join(",");
  if (f.axes.length) s.axis = f.axes.join(",");
  if (f.weights.length) s.weight = f.weights.join(",");
  if (f.widths.length) s.width = f.widths.join(",");
  if (f.scripts.length) s.script = f.scripts.join(",");
  if (f.languages.length) s.lang = f.languages.join(",");
  if (f.color.length) s.color = f.color.join(",");
  if (f.colorFormats.length) s.cfmt = f.colorFormats.join(",");
  if (f.classifications.length) s.cls = f.classifications.join(",");
  if (f.designers.length) s.dsr = f.designers.join(",");
  if (f.vendors.length) s.vnd = f.vendors.join(",");
  if (f.license.length) s.lic = f.license.join(",");
  if (f.repoHosts.length) s.repo = f.repoHosts.join(",");
  if (f.activity.length) s.act = f.activity.join(",");
  if (f.flags.length) s.flag = f.flags.join(",");
  if (f.italic.length) s.ital = f.italic.join(",");
  if (f.upm.length) s.upm = f.upm.join(",");
  encodeMetrics(f.metrics, s);
  if (f.hasHinting !== undefined) s.hint = f.hasHinting ? "1" : "0";
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
    class: str(raw.class),
    facet: str(raw.facet),
    axis: str(raw.axis),
    feature: str(raw.feature),
    weight: numCsv(raw.weight),
    width: numCsv(raw.width),
    script: str(raw.script),
    lang: str(raw.lang),
    color: str(raw.color),
    cfmt: str(raw.cfmt),
    cls: str(raw.cls),
    dsr: str(raw.dsr),
    vnd: str(raw.vnd),
    lic: str(raw.lic),
    repo: str(raw.repo),
    act: str(raw.act),
    flag: str(raw.flag),
    ital: str(raw.ital),
    upm: numCsv(raw.upm),
    mxh: str(raw.mxh),
    mch: str(raw.mch),
    mlh: str(raw.mlh),
    maw: str(raw.maw),
    mct: str(raw.mct),
    mfs: str(raw.mfs),
    hint: str(raw.hint),
    mode: str(raw.mode),
    view: raw.view === "row" ? "row" : undefined,
    sort: str(raw.sort),
  };
}
