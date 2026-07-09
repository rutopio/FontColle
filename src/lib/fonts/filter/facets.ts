// Build the set of selectable filter values with family counts, from the full
// dataset — the data behind every sidebar section's pills.
import { COLOR_FORMATS, isColorFont } from "../color";
import type { FontRecord } from "../types";
import { FONT_TYPE_FACETS } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

/** The selectable filter values with family counts, keyed by section. */
export type FacetIndex = ReturnType<typeof buildFacetIndex>;

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
  const color = new Map<string, number>();
  const colorFormats = new Map<string, number>();
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
    bump(color, isColorFont(font) ? "color" : "monochrome");
    for (const t of font.colorTables) bump(colorFormats, t);
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // Weight/width pills read best in ascending numeric order, not by count.
  const byStep = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  return {
    classes: sorted(classes),
    // Properties: every facet except static/variable, which the Axes panel owns
    // as its Font type radio pair. Excluding them here is what keeps Properties
    // from offering a second, duplicate entry point to the same filter — and it
    // scopes the Properties Reset off them too (clearSection only clears the
    // values its own section shows).
    facets: sorted(facets).filter(([v]) => !FONT_TYPE_FACETS.includes(v)),
    features: sorted(features),
    axes: sorted(axes),
    weights: byStep(weights),
    widths: byStep(widths),
    // real writing systems + languages (language-support task)
    wsScripts: sorted(wsScripts),
    languages: sorted(languages),
    // Monochrome first, then Colorful (fixed order, not by count).
    color: [
      ["monochrome", color.get("monochrome") ?? 0],
      ["color", color.get("color") ?? 0],
    ] as [string, number][],
    // Static/Variable in fixed order — the sole entry point for this filter.
    // Same underlying `facets` values, so applyFilters needs no special case.
    fontTypes: FONT_TYPE_FACETS.map(
      (v) => [v, facets.get(v) ?? 0] as [string, number]
    ),
    // Every format, in COLOR_FORMATS order, including the ones no published
    // font uses — they stay selectable rather than vanishing at count 0.
    colorFormats: COLOR_FORMATS.map(
      (f) => [f.id, colorFormats.get(f.id) ?? 0] as [string, number]
    ),
  };
}
