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
  categories: string[];
  tags: string[];
  features: string[];
  axes: string[];
  weights: string[];
  widths: string[];
  scripts: string[];
  languages: string[];
  color: string[];
  colorFormats: string[];
  style: string[];
  designers: string[];
  vendors: string[];
  license: string[];
  repoHosts: string[];
  activity: string[];
  flags: string[];
  italic: string[];
  upm: string[];
  instances?: InstanceRange;
  metrics: Partial<Record<MetricKey, MetricRange>>;
  hasHinting?: boolean;
  matchModes: Partial<Record<ModeKey, MatchMode>>;
}

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

export const FONT_TYPE_FACETS = ["static", "variable"];

export interface FilterSearch {
  q?: string;
  category?: string;
  tag?: string;
  feature?: string;
  axis?: string;
  weight?: string;
  width?: string;
  script?: string;
  lang?: string;
  color?: string;
  colorformat?: string;
  style?: string;
  mood?: string;
  designer?: string;
  vendor?: string;
  license?: string;
  repo?: string;
  activity?: string;
  noto?: string;
  italic?: string;
  upm?: string;
  instances?: string;
  xheight?: string;
  capheight?: string;
  lineheight?: string;
  avgwidth?: string;
  contrast?: string;
  filesize?: string;
  hinting?: string;
  mode?: string;
  sort?: string;
  fav?: string;
}

const splitCsv = (v: string | undefined): string[] =>
  v ? v.split(",").filter(Boolean) : [];

// "_" avoids %2C encoding in URLSearchParams.
const joinUnderscore = (xs: string[]): string => xs.join("_");

const splitUnderscore = (v: string | undefined): string[] => {
  if (!v) return [];
  const sep = v.includes(",") ? "," : "_";
  return v.split(sep).filter(Boolean);
};

const encodeClasses = (paths: string[]): string =>
  paths.map((p) => p.replace(/^\//, "").replace(/\//g, ".")).join("_");

const decodeClasses = (v: string | undefined): string[] => {
  if (!v) return [];
  if (v.includes("/")) return v.split(",").filter(Boolean);
  return v
    .split("_")
    .filter(Boolean)
    .map((seg) => `/${seg.replace(/\./g, "/")}`);
};

function encodeClassifications(paths: string[], s: FilterSearch): void {
  const style = paths.filter((p) => classificationGroupOf(p) !== "mood");
  const mood = paths.filter((p) => classificationGroupOf(p) === "mood");
  if (style.length) s.style = encodeClasses(style);
  if (mood.length) s.mood = encodeClasses(mood);
}

function decodeClassifications(s: FilterSearch): string[] {
  return [...decodeClasses(s.style), ...decodeClasses(s.mood)];
}

const encodeSource = (v: string): string => (v === "others" ? "non-noto" : v);
const decodeSource = (v: string): string => (v === "non-noto" ? "others" : v);

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

function decodeInstances(v: string | undefined): InstanceRange | undefined {
  const r = parseRange(v);
  if (!r) return undefined;
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

export function parseFilterSearch(raw: Record<string, unknown>): FilterSearch {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
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
