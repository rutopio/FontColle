// Filtering and search relevance: turn a FilterState into the matching subset.
import { isColorFont } from "../color";
import { type MetricKey, matchesRange, METRIC_SPECS } from "../metrics";
import type { FontRecord } from "../types";
import { TAG_MEMBERSHIP_THRESHOLD } from "./facets";
import type { FilterState } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

// Relevance of a font to a search query, higher = better. Name/display-name
// matches rank above designer-only matches, and exact/prefix/word-boundary
// matches rank above a mid-word substring, so "hk" surfaces "Noto Sans HK"
// ahead of the many designers whose names merely contain "hk". Returns 0 when
// the query matches nothing (the caller only scores rows that already passed
// the text filter, so 0 means "designer match with no name hit").
export function queryRelevance(font: FontRecord, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 0;

  const names = [font.name, font.displayName].filter((n): n is string => !!n);
  let best = 0;
  for (const name of names) {
    const n = name.toLowerCase();
    const idx = n.indexOf(q);
    if (idx < 0) continue;
    let score: number;
    if (n === q)
      score = 100; // exact name
    else if (idx === 0)
      score = 80; // name starts with query
    else if (/\s/.test(n[idx - 1] ?? ""))
      score = 60; // word-boundary (e.g. " HK")
    else score = 40; // mid-word substring
    // Shorter names with the same match tier are a tighter fit.
    score += Math.max(0, 10 - n.length / 8);
    best = Math.max(best, score);
  }
  if (best > 0) return best;

  // Designer-only match: weakest, so name hits always come first.
  return font.designer?.toLowerCase().includes(q) ? 10 : 0;
}

export function applyFilters(
  fonts: FontRecord[],
  f: FilterState
): FontRecord[] {
  const q = f.query.trim().toLowerCase();
  const metricKeys = Object.keys(f.metrics) as MetricKey[];
  return fonts.filter((font) => {
    // Match the family name, its Google Fonts display name, or the designer.
    if (
      q &&
      !font.name.toLowerCase().includes(q) &&
      !font.displayName?.toLowerCase().includes(q) &&
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
    // Color: at most one of "color" / "monochrome" (radio-style).
    if (f.color.length) {
      const wantColor = f.color.includes("color");
      if (isColorFont(font) !== wantColor) return false;
    }
    // AND across color formats: a font must carry every selected format's
    // table. Selecting COLR + SVG yields only the dual-format families.
    if (
      f.colorFormats.length &&
      !f.colorFormats.every((t) => font.colorTables.includes(t))
    )
      return false;
    // OR within classifications: family matches when it carries any selected
    // tag with a score of at least 50.
    if (
      f.classifications.length &&
      !f.classifications.some(
        (t) => (font.tags[t] ?? 0) >= TAG_MEMBERSHIP_THRESHOLD
      )
    )
      return false;
    // OR within license: family's license is one of the selected ids.
    if (f.license.length && !(font.license && f.license.includes(font.license)))
      return false;
    // OR within upm: family's units-per-em is one of the selected values.
    if (f.upm.length && !f.upm.includes(String(font.unitsPerEm)))
      return false;
    // AND across metric ranges: the font's derived value must fall in every
    // active range. A font with a null input to an active metric is excluded.
    for (const key of metricKeys) {
      const range = f.metrics[key];
      if (!range) continue;
      if (!matchesRange(font, METRIC_SPECS[key], range)) return false;
    }
    // Hinting: true requires the trait, false requires its absence.
    if (f.hasHinting === true && font.hasHinting !== true) return false;
    if (f.hasHinting === false && font.hasHinting === true) return false;
    return true;
  });
}
