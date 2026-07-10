// Derived style-metric values and their filter domains. One place both the
// sidebar sliders and applyFilters read from, so the ratios they compare are
// computed identically. Every derivation returns null when any raw input it
// needs is missing (or unitsPerEm is absent/zero); a null value is excluded
// while its slider is active and ignored while it's inactive.
import type { FontRecord } from "./types";

// The six range-slider metrics, in display order.
export type MetricKey =
  | "xHeight"
  | "capHeight"
  | "lineHeight"
  | "avgWidth"
  | "upm"
  | "fileSize";

// A [lo, hi] range, in the metric's own units (ratios for the first four,
// raw upm, raw bytes for fileSize).
export type MetricRange = [number, number];

export interface MetricSpec {
  key: MetricKey;
  label: string;
  // Domain edges. A thumb resting on an edge means "unbounded on that side":
  // the domains deliberately clip outliers, so a full-extent slider excludes
  // nothing (see derive()/matchesRange).
  min: number;
  max: number;
  step: number;
  // "linear": value maps straight onto the track (ratios, fileSize uses log
  // via `log`). "log": track works in log space. "snap": track is an index
  // into the sorted distinct catalog values (upm).
  scale: "linear" | "log" | "snap";
}

// Ratio domains sized from the p1/median/p99 distribution over the catalog so
// the sliders resolve the dense middle while clipping the long tails.
export const METRIC_SPECS: Record<MetricKey, MetricSpec> = {
  xHeight: {
    key: "xHeight",
    label: "x-height ratio",
    min: 0.1,
    max: 0.9,
    step: 0.01,
    scale: "linear",
  },
  capHeight: {
    key: "capHeight",
    label: "Cap-height ratio",
    min: 0.2,
    max: 1.1,
    step: 0.01,
    scale: "linear",
  },
  lineHeight: {
    key: "lineHeight",
    label: "Line-height ratio",
    min: 0.9,
    max: 2.5,
    step: 0.01,
    scale: "linear",
  },
  avgWidth: {
    key: "avgWidth",
    label: "Avg width ratio",
    min: 0.2,
    max: 1.2,
    step: 0.01,
    scale: "linear",
  },
  // Domain filled in per-catalog by buildMetricIndex (distinct upm values).
  upm: {
    key: "upm",
    label: "Units per em",
    min: 0,
    max: 0,
    step: 1,
    scale: "snap",
  },
  // 16KB … 64MB, log-scaled. Stored/compared in raw bytes.
  fileSize: {
    key: "fileSize",
    label: "File size",
    min: 16 * 1024,
    max: 64 * 1024 * 1024,
    step: 1,
    scale: "log",
  },
};

// The order the metrics render in the sidebar.
export const METRIC_ORDER: MetricKey[] = [
  "xHeight",
  "capHeight",
  "lineHeight",
  "avgWidth",
  "upm",
  "fileSize",
];

const ratio = (n: number | null, d: number | null): number | null =>
  n != null && d != null && d > 0 ? n / d : null;

/** The derived value a font contributes to a given metric, or null when a
 *  required raw field is missing. Shared by the UI and applyFilters. */
export function derive(font: FontRecord, key: MetricKey): number | null {
  const upm = font.unitsPerEm;
  switch (key) {
    case "xHeight":
      return ratio(font.xHeight, upm);
    case "capHeight":
      return ratio(font.capHeight, upm);
    case "avgWidth":
      return ratio(font.avgCharWidth, upm);
    case "upm":
      return upm != null && upm > 0 ? upm : null;
    case "fileSize":
      return font.fileSize != null && font.fileSize > 0 ? font.fileSize : null;
    case "lineHeight": {
      if (upm == null || upm <= 0) return null;
      // fsSelection bit 7 (useTypoMetrics) picks the typo* trio; otherwise the
      // hhea* trio governs line height. winDescent is stored positive.
      const asc = font.useTypoMetrics ? font.typoAscender : font.hheaAscender;
      const desc = font.useTypoMetrics
        ? font.typoDescender
        : font.hheaDescender;
      const gap = font.useTypoMetrics ? font.typoLineGap : font.hheaLineGap;
      if (asc == null || desc == null || gap == null) return null;
      return (asc - desc + gap) / upm;
    }
  }
}

/** True when a font's derived value falls in an active range. A thumb on the
 *  domain edge is treated as unbounded on that side, so outliers past the edge
 *  still match. Fonts whose derived value is null never match an active range. */
export function matchesRange(
  font: FontRecord,
  spec: MetricSpec,
  [lo, hi]: MetricRange
): boolean {
  const v = derive(font, spec.key);
  if (v == null) return false;
  if (lo > spec.min && v < lo) return false;
  if (hi < spec.max && v > hi) return false;
  return true;
}

/** A range is active (filters anything) only when a thumb has moved off a
 *  domain edge. Inactive ranges are dropped from state and the URL. */
export function isRangeActive(
  spec: MetricSpec,
  [lo, hi]: MetricRange
): boolean {
  return lo > spec.min || hi < spec.max;
}

/** Effective spec for a metric, given the catalog: fills the upm domain with
 *  the sorted distinct values present so its slider snaps across them. */
export function specForCatalog(
  key: MetricKey,
  upmValues: number[]
): MetricSpec {
  const spec = METRIC_SPECS[key];
  if (key !== "upm" || upmValues.length === 0) return spec;
  return { ...spec, min: upmValues[0], max: upmValues[upmValues.length - 1] };
}

/** The sorted distinct unitsPerEm values in the catalog (ascending). Drives
 *  the upm slider's snap points and its effective domain. */
export function catalogUpmValues(fonts: FontRecord[]): number[] {
  const set = new Set<number>();
  for (const f of fonts)
    if (f.unitsPerEm != null && f.unitsPerEm > 0) set.add(f.unitsPerEm);
  return [...set].sort((a, b) => a - b);
}
