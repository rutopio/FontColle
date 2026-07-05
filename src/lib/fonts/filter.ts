import type { FontRecord } from "./types";

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
}

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
};

// Standard weight steps we expose as pills. Mirrors the harvester's snapping.
export const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

// Human labels for the weight pills.
export const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};

// usWidthClass steps (1..9) and their nominal percentage, used to map a variable
// wdth axis range (expressed in percent) onto the discrete width pills.
export const WIDTH_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// Plain Condensed/Expanded/Normal stay spelled out; the compound widths are
// abbreviated (Cond./Expd.) so they fit the small width pills.
export const WIDTH_LABELS: Record<number, string> = {
  1: "Ultra Cond.",
  2: "Extra Cond.",
  3: "Condensed",
  4: "Semi Cond.",
  5: "Normal",
  6: "Semi Expd.",
  7: "Expanded",
  8: "Extra Expd.",
  9: "Ultra Expd.",
};
export const WIDTH_STEP_PCT: Record<number, number> = {
  1: 50,
  2: 62.5,
  3: 75,
  4: 87.5,
  5: 100,
  6: 112.5,
  7: 125,
  8: 150,
  9: 200,
};

/** Standard weight steps a family offers (already derived in the dataset). */
export function familyWeightSet(font: FontRecord): number[] {
  if (font.weights.length) return font.weights;
  // Fallback for records without a derived list: snap the primary weightClass.
  const wc = font.weightClass;
  if (wc == null) return [];
  const nearest = WEIGHT_STEPS.reduce((best, s) =>
    Math.abs(s - wc) < Math.abs(best - wc) ? s : best
  );
  return [nearest];
}

/** usWidthClass steps a family covers: its static width, plus wdth-axis range. */
export function familyWidthSet(font: FontRecord): number[] {
  const steps = new Set<number>();
  const wdth = font.axes.find((a) => a.tag === "wdth");
  if (wdth && wdth.min != null && wdth.max != null) {
    for (const step of WIDTH_STEPS) {
      const pct = WIDTH_STEP_PCT[step];
      if (pct >= wdth.min && pct <= wdth.max) steps.add(step);
    }
  }
  // Static width (or the variable's default width class) as a discrete bucket.
  if (font.widthClass != null && font.widthClass >= 1 && font.widthClass <= 9) {
    steps.add(font.widthClass);
  }
  return [...steps].sort((a, b) => a - b);
}

// URL search-param shape. Filters live in the URL so they persist across
// list <-> detail navigation, and the detail sidebar can link back to the list
// with a filter applied. Arrays are comma-joined; empty keys are omitted.
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
  view?: "grid" | "row"; // display preference, not a filter
  sort?: string; // sort key, not a filter
}

const splitCsv = (v: string | undefined): string[] =>
  v ? v.split(",").filter(Boolean) : [];

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
  return s;
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
    view: raw.view === "row" ? "row" : undefined,
    sort: str(raw.sort),
  };
}

export function applyFilters(
  fonts: FontRecord[],
  f: FilterState
): FontRecord[] {
  const q = f.query.trim().toLowerCase();
  return fonts.filter((font) => {
    // Match the family name or the designer/creator.
    if (
      q &&
      !font.name.toLowerCase().includes(q) &&
      !font.designer?.toLowerCase().includes(q)
    )
      return false;
    if (f.classes.length && !f.classes.includes(font.class)) return false;
    if (f.facets.length && !f.facets.every((x) => font.facets.includes(x)))
      return false;
    if (
      f.features.length &&
      !f.features.every((x) => font.features.includes(x))
    )
      return false;
    if (
      f.axes.length &&
      !f.axes.every((tag) => font.axes.some((a) => a.tag === tag))
    )
      return false;
    // OR within weights: family must offer at least one selected weight step.
    if (f.weights.length) {
      const set = familyWeightSet(font);
      if (!f.weights.some((w) => set.includes(Number(w)))) return false;
    }
    // OR within widths.
    if (f.widths.length) {
      const set = familyWidthSet(font);
      if (!f.widths.some((w) => set.includes(Number(w)))) return false;
    }
    // AND across scripts: family must cover every selected writing system.
    if (f.scripts.length && !f.scripts.every((s) => font.scripts.includes(s)))
      return false;
    // AND across languages: family must support every selected language.
    if (
      f.languages.length &&
      !f.languages.every((l) => font.languages.includes(l))
    )
      return false;
    return true;
  });
}

/** Build the set of selectable values with counts, from the full dataset. */
export function buildFacetIndex(fonts: FontRecord[]) {
  const classes = new Map<string, number>();
  const facets = new Map<string, number>();
  const features = new Map<string, number>();
  const axes = new Map<string, number>();
  const weights = new Map<string, number>();
  const widths = new Map<string, number>();
  const wsScripts = new Map<string, number>(); // real writing systems (Latn…)
  const languages = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const font of fonts) {
    bump(classes, font.class);
    for (const x of font.facets) bump(facets, x);
    for (const x of font.features) bump(features, x);
    for (const a of font.axes) bump(axes, a.tag);
    for (const w of familyWeightSet(font)) bump(weights, String(w));
    for (const w of familyWidthSet(font)) bump(widths, String(w));
    for (const s of font.scripts) bump(wsScripts, s);
    for (const l of font.languages) bump(languages, l);
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // Weight/width pills read best in ascending numeric order, not by count.
  const byStep = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  return {
    classes: sorted(classes),
    facets: sorted(facets),
    features: sorted(features),
    axes: sorted(axes),
    weights: byStep(weights),
    widths: byStep(widths),
    // real writing systems + languages (language-support task)
    wsScripts: sorted(wsScripts),
    languages: sorted(languages),
  };
}
