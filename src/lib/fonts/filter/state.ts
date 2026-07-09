// Filter state shape, its empty value, and the URL <-> state codec. Filters
// live in the URL so they persist across list <-> detail navigation and the
// detail sidebar can link back to the list with a filter applied.

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
}

// The slice of the filter a preview (card/row) needs to know about, to both
// drive the live preview and highlight the trait badges that match. Bundled so
// the grid passes one object instead of six loose arrays.
export type FilterSelection = Pick<
  FilterState,
  "classes" | "facets" | "color" | "axes" | "weights" | "widths"
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
    color: splitCsv(s.color),
    colorFormats: splitCsv(s.cfmt),
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
    f.colorFormats.length
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
    view: raw.view === "row" ? "row" : undefined,
    sort: str(raw.sort),
  };
}
