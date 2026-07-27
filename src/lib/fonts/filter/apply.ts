// Filtering and search relevance: turn a FilterState into the matching subset.
import uFuzzy from "@leeoniya/ufuzzy";
import { isColorFont } from "@/lib/fonts/color";
import { vendorLabel } from "@/lib/fonts/labels";
import {
  METRIC_SPECS,
  type MetricKey,
  matchesRange,
} from "@/lib/fonts/metrics";
import type { FontRecord } from "@/lib/fonts/types";
import {
  designerTokens,
  foldVendor,
  fontActivity,
  meetsTagThreshold,
  repoHost,
} from "./facets";
import { instanceInRange } from "./instances";
import { MODE_KEYS, type ModeKey, matchMode } from "./match-mode";
import type { FilterState } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

// `unicode: true` so CJK family names match; the intra* options are uFuzzy's
// SingleError preset, tolerating one typo per term ("huninnn" -> "Huninn").
const uf = new uFuzzy({
  unicode: true,
  intraIns: 1,
  intraMode: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

// Name first, so a name hit ranks above a vendor/designer-only one: uFuzzy
// rewards earlier, tighter matches. Vendor goes in as both the foundry name
// ("Google") and the raw 4-char id ("GOOG").
function haystackFor(font: FontRecord): string {
  const parts = [font.name];
  if (font.displayName && font.displayName !== font.name)
    parts.push(font.displayName);
  parts.push(...designerTokens(font));
  const vnd = foldVendor(font.vendorId);
  if (vnd) {
    const label = vendorLabel(vnd);
    parts.push(label);
    if (label !== vnd) parts.push(vnd);
  }
  return parts.join(" ");
}

// uFuzzy ranks by match shape alone, so "Noto Sans" and "Noto Sans TC" score
// alike; this tier pulls the exact family ahead of its derivatives.
function exactnessTier(font: FontRecord, needle: string): number {
  const names = [font.name, font.displayName].filter(Boolean) as string[];
  const folded = names.map((n) => n.toLowerCase());
  if (folded.some((n) => n === needle)) return 0;
  if (folded.some((n) => n.startsWith(`${needle} `))) return 1;
  if (folded.some((n) => n.startsWith(needle))) return 2;
  if (folded.some((n) => n.includes(needle))) return 3;
  return 4;
}

// Runs AFTER applyFilters, so `fonts` is already the facet-filtered candidates.
export function searchByQuery(
  fonts: FontRecord[],
  rawQuery: string
): FontRecord[] {
  const needle = rawQuery.trim();
  if (!needle) return fonts;
  const haystack = fonts.map(haystackFor);
  const [idxs, info, order] = uf.search(haystack, needle);
  if (!idxs || idxs.length === 0) return [];
  // With ranking info, `order` indexes into `info.idx`; without it (very short
  // needles that skip the info pass) `idxs` is already the match set.
  const ranked =
    info && order
      ? order.map((o) => fonts[info.idx[o]])
      : idxs.map((i) => fonts[i]);
  const lower = needle.toLowerCase();
  return ranked
    .map((font, i) => ({ font, i, tier: exactnessTier(font, lower) }))
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (a.tier < 4 ? a.font.name.length - b.font.name.length : 0) ||
        a.i - b.i
    )
    .map((e) => e.font);
}

// Only used for the "Did you mean" suggestion, so the O(n*m) cost is fine.
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

const MAX_SUGGESTIONS = 5;

// Compares against each name AND its individual words, so "huninnn" finds
// "Bpmf Huninn". Returns several: a query can sit near more than one family.
export function suggestFamilies(
  rawQuery: string,
  fonts: FontRecord[]
): string[] {
  const q = rawQuery.trim().toLowerCase();
  // Too short to typo-correct meaningfully (every 3-letter name is ~2 edits away).
  if (q.length < 3) return [];
  // Looser than the fuzzy search's single-error match, so a two-typo query the
  // search itself misses ("robotaa" -> "Roboto") still surfaces here.
  const maxDist = Math.max(1, Math.floor(q.length / 3));

  const best = new Map<string, number>();
  for (const font of fonts) {
    const names = [font.name, font.displayName].filter((n): n is string => !!n);
    for (const name of names) {
      const candidates = [
        name.toLowerCase(),
        ...name.toLowerCase().split(/\s+/),
      ];
      let nameDist = maxDist + 1;
      for (const cand of candidates) {
        if (Math.abs(cand.length - q.length) > maxDist) continue;
        const d = editDistance(q, cand);
        if (d < nameDist) nameDist = d;
        if (nameDist === 0) break;
      }
      if (nameDist <= maxDist) {
        const prev = best.get(name);
        if (prev === undefined || nameDist < prev) best.set(name, nameDist);
      }
    }
  }
  return [...best.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_SUGGESTIONS)
    .map(([name]) => name);
}

export function applyFilters(
  fonts: FontRecord[],
  f: FilterState
): FontRecord[] {
  const metricKeys = Object.keys(f.metrics) as MetricKey[];
  // Modes depend only on the filter, so resolve them once rather than per font
  // in the 2000+-iteration loop below.
  const isAny = Object.fromEntries(
    MODE_KEYS.map((k) => [k, matchMode(f, k) === "any"])
  ) as Record<ModeKey, boolean>;
  const combine = <T>(key: ModeKey, values: T[], has: (v: T) => boolean) =>
    isAny[key] ? values.some(has) : values.every(has);
  // A radio section holds 0 or 1 value, so it never needs a combine mode: it
  // just asserts a boolean trait. `on` names the value meaning "true".
  const radio = (selected: string[], on: string, trait: boolean) =>
    selected.length === 0 || selected.includes(on) === trait;
  // The text query is NOT applied here: searchByQuery runs after this facet
  // pass, so it can filter and order in one step.
  return fonts.filter((font) => {
    if (f.categories.length && !f.categories.includes(font.category))
      return false;
    if (f.tags.length && !f.tags.every((x) => font.facets.includes(x)))
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
    if (f.weights.length) {
      const set = familyWeightSet(font);
      if (!combine("weights", f.weights, (w) => set.includes(Number(w))))
        return false;
    }
    if (f.widths.length) {
      const set = familyWidthSet(font);
      if (!combine("widths", f.widths, (w) => set.includes(Number(w))))
        return false;
    }
    if (
      f.scripts.length &&
      !combine("scripts", f.scripts, (s) => font.scripts.includes(s))
    )
      return false;
    if (
      f.languages.length &&
      !combine("languages", f.languages, (l) => font.languages.includes(l))
    )
      return false;
    if (!radio(f.color, "color", isColorFont(font))) return false;
    if (
      f.colorFormats.length &&
      !combine("colorFormats", f.colorFormats, (t) =>
        font.colorTables.includes(t)
      )
    )
      return false;
    if (
      f.style.length &&
      !combine("style", f.style, (t) => meetsTagThreshold(t, font.tags[t] ?? 0))
    )
      return false;
    // The designer field is comma-joined, so match on the split tokens.
    if (f.designers.length) {
      const tokens = designerTokens(font);
      if (!combine("designers", f.designers, (d) => tokens.includes(d)))
        return false;
    }
    if (f.vendors.length) {
      const vnd = foldVendor(font.vendorId);
      if (!vnd || !f.vendors.includes(vnd)) return false;
    }
    if (f.license.length && !(font.license && f.license.includes(font.license)))
      return false;
    if (
      f.repoHosts.length &&
      !f.repoHosts.includes(repoHost(font.repositoryUrl))
    )
      return false;
    if (f.activity.length && !f.activity.includes(fontActivity(font)))
      return false;
    if (!radio(f.flags, "noto", !!font.isNoto)) return false;
    if (!radio(f.italic, "italic", font.facets.includes("has-italic")))
      return false;
    if (f.upm.length && !f.upm.includes(String(font.unitsPerEm))) return false;
    if (f.instances && !instanceInRange(font, f.instances)) return false;
    // A font with a null input to an active metric is excluded.
    for (const key of metricKeys) {
      const range = f.metrics[key];
      if (!range) continue;
      if (!matchesRange(font, METRIC_SPECS[key], range)) return false;
    }
    if (f.hasHinting === true && font.hasHinting !== true) return false;
    if (f.hasHinting === false && font.hasHinting === true) return false;
    return true;
  });
}
