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
  repoHost,
  TAG_MEMBERSHIP_THRESHOLD,
} from "./facets";
import { instanceInRange } from "./instances";
import { MODE_KEYS, type ModeKey, matchMode } from "./match-mode";
import type { FilterState } from "./state";
import { familyWeightSet, familyWidthSet } from "./weights";

// One uFuzzy instance, reused across searches. `unicode: true` so CJK family
// names (now the common case for the Google catalog) match; `intraIns: 1` lets a
// stray extra char inside a term still hit ("huninnn" -> "Huninn"). SingleError
// tolerates one substitution/transposition/deletion per term, giving the
// typo-forgiveness the old editDistance path only offered on a zero-result
// fallback. Term bounds stay loose (default) so mid-name matches still surface.
const uf = new uFuzzy({
  unicode: true,
  intraIns: 1,
  intraMode: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

// The searchable text for a font, in priority order: name first so a name hit
// ranks above a vendor/designer-only hit (uFuzzy rewards earlier, tighter, more
// contiguous matches, and the name leads the string). Includes the family name,
// its Google display name, every designer token, and the vendor — both the
// human foundry name ("Google") and the raw 4-char id ("GOOG").
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

// How literally a font's name answers the query. uFuzzy ranks by match shape
// alone, so "Noto Sans" and "Noto Sans TC" score alike; this tier pulls the
// exact family ahead of its derivatives. Lower is better.
function exactnessTier(font: FontRecord, needle: string): number {
  const names = [font.name, font.displayName].filter(Boolean) as string[];
  const folded = names.map((n) => n.toLowerCase());
  if (folded.some((n) => n === needle)) return 0;
  if (folded.some((n) => n.startsWith(`${needle} `))) return 1;
  if (folded.some((n) => n.startsWith(needle))) return 2;
  if (folded.some((n) => n.includes(needle))) return 3;
  return 4;
}

// Fuzzy text search over name / display name / designers / vendor, returning the
// matches best-first. The caller runs this AFTER applyFilters, so `fonts` is
// already the facet-filtered candidate set; an empty query is handled upstream.
// Falls back to the input order when uFuzzy finds nothing (so a non-matching
// query yields an empty list, which the empty state + suggestFamilies handle).
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
    info && order ? order.map((o) => fonts[info.idx[o]]) : idxs.map((i) => fonts[i]);
  // Stable re-sort: literal name hits first, uFuzzy's relevance order within a
  // tier, and the shorter name wins a tie so "Noto Sans" precedes "Noto Sans TC".
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

// How many "Did you mean" suggestions to offer at most.
const MAX_SUGGESTIONS = 5;

// Family names close to a search query that returned nothing, closest first —
// empty when none are near enough to be worth suggesting. Powers the "Did you
// mean …?" hint on the empty state, a typo-tolerant fallback over the fuzzy
// search. Compares the query against each family/display name and, for
// multi-word names, their individual words, so "intr" finds "Inter" and
// "huninnn" finds "Bpmf Huninn". A match must be within ~1 edit per 4 query
// chars. Returns several so a query near more than one family (e.g. "huninnn"
// vs several "… Huninn" cuts) lists them all rather than picking one.
export function suggestFamilies(
  rawQuery: string,
  fonts: FontRecord[]
): string[] {
  const q = rawQuery.trim().toLowerCase();
  // Too short to typo-correct meaningfully (every 3-letter name is ~2 edits away).
  if (q.length < 3) return [];
  // ~1 edit per 3 query chars: looser than the fuzzy search's single-error match,
  // so a two-typo query the search itself misses ("robotaa" -> "Roboto", distance
  // 2) still surfaces as a suggestion. Short queries (3-5) stay at a single edit.
  const maxDist = Math.max(1, Math.floor(q.length / 3));

  // Best (smallest) edit distance seen per family name, so each family appears
  // once even when several of its words match, ranked by its closest word.
  const best = new Map<string, number>();
  for (const font of fonts) {
    const names = [font.name, font.displayName].filter((n): n is string => !!n);
    for (const name of names) {
      // Compare against the whole name and each of its words, taking the best,
      // so a query matching one word of a multi-word family still suggests it.
      const candidates = [
        name.toLowerCase(),
        ...name.toLowerCase().split(/\s+/),
      ];
      let nameDist = maxDist + 1;
      for (const cand of candidates) {
        // Skip candidates whose length is too far off to ever be within range.
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
  // The text query is NOT applied here: it's a fuzzy text search over several
  // fields, run by searchByQuery after this facet pass so the query both filters
  // and orders in one step. applyFilters is the pure facet gate.
  return fonts.filter((font) => {
    if (f.classes.length && !f.classes.includes(font.class)) return false;
    if (
      f.tags.length &&
      !combine("tags", f.tags, (x) => font.facets.includes(x))
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
    // Weights: AND by default (cover every selected step, e.g. both Light and
    // Bold cuts), OR when toggled (offer at least one selected step).
    if (f.weights.length) {
      const set = familyWeightSet(font);
      if (!combine("weights", f.weights, (w) => set.includes(Number(w))))
        return false;
    }
    // Widths: AND by default, OR when toggled.
    if (f.widths.length) {
      const set = familyWidthSet(font);
      if (!combine("widths", f.widths, (w) => set.includes(Number(w))))
        return false;
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
    // Style: OR by default (carry any selected tag scoring >= 50),
    // AND when toggled.
    if (
      f.style.length &&
      !combine(
        "style",
        f.style,
        (t) => (font.tags[t] ?? 0) >= TAG_MEMBERSHIP_THRESHOLD
      )
    )
      return false;
    // Designers: OR by default (family lists at least one selected designer),
    // AND when toggled (co-designed by every selected name). The designer field
    // is comma-joined, so match on the split tokens.
    if (f.designers.length) {
      const tokens = designerTokens(font);
      if (!combine("designers", f.designers, (d) => tokens.includes(d)))
        return false;
    }
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
    // Activity: multi-select OR; family's maintenance bucket is one of the
    // selected ones.
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
    // Instance count within the selected range (inclusive).
    if (f.instances && !instanceInRange(font, f.instances)) return false;
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
