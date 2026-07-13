// Filtering and search relevance: turn a FilterState into the matching subset.
import { isColorFont } from "../color";
import { METRIC_SPECS, type MetricKey, matchesRange } from "../metrics";
import type { FontRecord } from "../types";
import {
  designerTokens,
  foldVendor,
  fontActivity,
  repoHost,
  TAG_MEMBERSHIP_THRESHOLD,
} from "./facets";
import { MODE_KEYS, type ModeKey, matchMode } from "./match-mode";
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

// Levenshtein edit distance between two short strings, capped implicitly by
// their lengths. Used only for the "Did you mean" suggestion, so the O(n*m)
// cost is fine (query and family names are short).
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// The closest family name to a search query that returned nothing, or null when
// no name is close enough to be worth suggesting. Powers a "Did you mean …?"
// hint on the empty state — a typo-tolerant fallback over the pure-substring
// search. Compares the query against each family/display name and, for
// multi-word names, their individual words, so "intr" finds "Inter" and
// "robato" finds "Roboto". A match must be within ~1 edit per 4 query chars.
export function suggestFamily(
  rawQuery: string,
  fonts: FontRecord[]
): string | null {
  const q = rawQuery.trim().toLowerCase();
  // Too short to typo-correct meaningfully (every 3-letter name is ~2 edits away).
  if (q.length < 3) return null;
  const maxDist = Math.max(1, Math.floor(q.length / 4));

  let bestName: string | null = null;
  let bestDist = maxDist + 1;
  for (const font of fonts) {
    const names = [font.name, font.displayName].filter((n): n is string => !!n);
    for (const name of names) {
      // Compare against the whole name and each of its words, taking the best,
      // so a query matching one word of a multi-word family still suggests it.
      const candidates = [
        name.toLowerCase(),
        ...name.toLowerCase().split(/\s+/),
      ];
      for (const cand of candidates) {
        // Skip candidates whose length is too far off to ever be within range.
        if (Math.abs(cand.length - q.length) > bestDist) continue;
        const d = editDistance(q, cand);
        if (d < bestDist) {
          bestDist = d;
          bestName = name;
          if (d === 0) return name;
        }
      }
    }
  }
  return bestName;
}

export function applyFilters(
  fonts: FontRecord[],
  f: FilterState
): FontRecord[] {
  const q = f.query.trim().toLowerCase();
  const metricKeys = Object.keys(f.metrics) as MetricKey[];
  // Each section's OR/AND mode depends only on the filter, not the font, so
  // resolve the toggleable sections once here rather than per font in the
  // 2000+-iteration loop below.
  const isAny = Object.fromEntries(
    MODE_KEYS.map((k) => [k, matchMode(f, k) === "any"])
  ) as Record<ModeKey, boolean>;
  // Combine a section's selected values by its mode: "any" passes when at least
  // one matches, "all" when every one does. Empty selections are handled by the
  // caller's length guard, so `has` runs over a non-empty list.
  const combine = <T>(key: ModeKey, values: T[], has: (v: T) => boolean) =>
    isAny[key] ? values.some(has) : values.every(has);
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
    if (
      f.facets.length &&
      !combine("facets", f.facets, (x) => font.facets.includes(x))
    )
      return false;
    if (
      f.features.length &&
      !combine("features", f.features, (x) => font.features.includes(x))
    )
      return false;
    if (
      f.axes.length &&
      !combine("axes", f.axes, (tag) => font.axes.some((a) => a.tag === tag))
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
    // Writing systems: AND by default (cover every selected), OR when toggled.
    if (
      f.scripts.length &&
      !combine("scripts", f.scripts, (s) => font.scripts.includes(s))
    )
      return false;
    // Languages: AND by default (support every selected), OR when toggled.
    if (
      f.languages.length &&
      !combine("languages", f.languages, (l) => font.languages.includes(l))
    )
      return false;
    // Color: at most one of "color" / "monochrome" (radio-style).
    if (f.color.length) {
      const wantColor = f.color.includes("color");
      if (isColorFont(font) !== wantColor) return false;
    }
    // Color formats: AND by default (carry every selected table, so COLR + SVG
    // yields only dual-format families), OR when toggled.
    if (
      f.colorFormats.length &&
      !combine("colorFormats", f.colorFormats, (t) =>
        font.colorTables.includes(t)
      )
    )
      return false;
    // Classifications: OR by default (carry any selected tag scoring >= 50),
    // AND when toggled.
    if (
      f.classifications.length &&
      !combine(
        "classifications",
        f.classifications,
        (t) => (font.tags[t] ?? 0) >= TAG_MEMBERSHIP_THRESHOLD
      )
    )
      return false;
    // OR within designers: family lists at least one selected designer (its
    // designer field is comma-joined, so match on the split tokens).
    if (
      f.designers.length &&
      !designerTokens(font).some((d) => f.designers.includes(d))
    )
      return false;
    // OR within vendors: family's folded vendor id is one of the selected.
    if (f.vendors.length) {
      const vnd = foldVendor(font.vendorId);
      if (!vnd || !f.vendors.includes(vnd)) return false;
    }
    // OR within license: family's license is one of the selected ids.
    if (f.license.length && !(font.license && f.license.includes(font.license)))
      return false;
    // OR within repo hosts: family's repository host is one of the selected.
    if (
      f.repoHosts.length &&
      !f.repoHosts.includes(repoHost(font.repositoryUrl))
    )
      return false;
    // Activity: radio-style; family's maintenance bucket is the selected one.
    if (f.activity.length && !f.activity.includes(fontActivity(font)))
      return false;
    // Source: radio-style Noto / Others (at most one). Every published family
    // is one or the other, so this partitions the catalog.
    if (f.flags.length) {
      const wantNoto = f.flags.includes("noto");
      if (!!font.isNoto !== wantNoto) return false;
    }
    // Italic: radio-style. "italic" keeps families that offer an italic style
    // (carry the has-italic facet); "upright" keeps the rest.
    if (f.italic.length) {
      const wantItalic = f.italic.includes("italic");
      if (font.facets.includes("has-italic") !== wantItalic) return false;
    }
    // OR within upm: family's units-per-em is one of the selected values.
    if (f.upm.length && !f.upm.includes(String(font.unitsPerEm))) return false;
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
