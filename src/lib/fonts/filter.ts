import type { FontRecord } from "./types";

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
  const features = new Map<string, number>();
  const axes = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const font of fonts) {
    bump(classes, font.class);
    for (const x of font.facets) bump(facets, x);
    for (const x of font.features) bump(features, x);
    for (const a of font.axes) bump(axes, a.tag);
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    classes: sorted(classes),
    facets: sorted(facets),
    features: sorted(features),
    axes: sorted(axes),
  };
}
