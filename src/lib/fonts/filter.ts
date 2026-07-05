import type { FontRecord } from "./types";

// Script/language facets, split out of Properties into their own sidebar
// section. They still live in `filter.facets` (AND-combined), so this is a
// display grouping, not a new filter dimension.
export const SCRIPT_FACETS = new Set([
  "latin",
  "cjk",
  "arabic",
  "cyrillic",
  "greek",
  "hebrew",
  "thai",
  "devanagari",
]);

export interface FilterState {
  query: string;
  classes: string[]; // primary class, OR within
  facets: string[]; // facet tags, AND across
  features: string[]; // OpenType feature tags, AND across
  axes: string[]; // axis tags, AND across
}

export const emptyFilter: FilterState = {
  query: "",
  classes: [],
  facets: [],
  features: [],
  axes: [],
};

// URL search-param shape. Filters live in the URL so they persist across
// list <-> detail navigation, and the detail sidebar can link back to the list
// with a filter applied. Arrays are comma-joined; empty keys are omitted.
export interface FilterSearch {
  q?: string;
  class?: string;
  facet?: string;
  feature?: string;
  axis?: string;
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
  };
}

export function filterToSearch(f: FilterState): FilterSearch {
  const s: FilterSearch = {};
  if (f.query) s.q = f.query;
  if (f.classes.length) s.class = f.classes.join(",");
  if (f.facets.length) s.facet = f.facets.join(",");
  if (f.features.length) s.feature = f.features.join(",");
  if (f.axes.length) s.axis = f.axes.join(",");
  return s;
}

/** Validate/coerce raw URL search into FilterSearch (drops unknown keys). */
export function parseFilterSearch(raw: Record<string, unknown>): FilterSearch {
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    q: str(raw.q),
    class: str(raw.class),
    facet: str(raw.facet),
    feature: str(raw.feature),
    axis: str(raw.axis),
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
    if (q && !font.name.toLowerCase().includes(q)) return false;
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
    return true;
  });
}

/** Build the set of selectable values with counts, from the full dataset. */
export function buildFacetIndex(fonts: FontRecord[]) {
  const classes = new Map<string, number>();
  const facets = new Map<string, number>();
  const scripts = new Map<string, number>();
  const features = new Map<string, number>();
  const axes = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const font of fonts) {
    bump(classes, font.class);
    for (const x of font.facets)
      bump(SCRIPT_FACETS.has(x) ? scripts : facets, x);
    for (const x of font.features) bump(features, x);
    for (const a of font.axes) bump(axes, a.tag);
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    classes: sorted(classes),
    facets: sorted(facets),
    scripts: sorted(scripts),
    features: sorted(features),
    axes: sorted(axes),
  };
}
