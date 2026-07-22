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
  | "contrast"
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
  // "linear": value maps straight onto the track (ratios). "log": track works
  // in log space (fileSize).
  scale: "linear" | "log";
  // p25/p50/p75 of this metric's value over the published catalog (computed
  // 2026-07-11). They split the domain into four quartile pills (Q1…Q4), so
  // each pill selects a range holding ~1/4 of the fonts, unlike an even split
  // of the clipped domain, whose edge buckets are near-empty.
  quantiles: [number, number, number];
  // One-sentence explanation of what the ratio measures and what higher/lower
  // looks like on the page. Shown in the metric's info-icon tooltip.
  hint: string;
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
    quantiles: [0.464, 0.5, 0.535],
    hint: "Height of lowercase letters (the 'x') relative to the em. Higher means a taller x-height, the font looks larger and more legible at small sizes; lower reads as more classic or elegant.",
  },
  capHeight: {
    key: "capHeight",
    label: "Cap-height ratio",
    min: 0.2,
    max: 1.1,
    step: 0.01,
    scale: "linear",
    quantiles: [0.665, 0.7, 0.729],
    hint: "Height of capital letters relative to the em. Higher caps feel bolder and more imposing; lower caps sit more quietly against lowercase text.",
  },
  lineHeight: {
    key: "lineHeight",
    label: "Line-height ratio",
    min: 0.9,
    max: 2.5,
    step: 0.01,
    scale: "linear",
    quantiles: [1.2, 1.3, 1.448],
    hint: "Default line height the font asks for (ascender − descender + line gap) relative to the em. Higher means the font wants more space between lines; lower packs lines tighter.",
  },
  avgWidth: {
    key: "avgWidth",
    label: "Avg width ratio",
    min: 0.2,
    max: 1.2,
    step: 0.01,
    scale: "linear",
    quantiles: [0.497, 0.563, 0.635],
    hint: "Average character width relative to the em (OS/2 average). Higher means a wider, more spacious font; lower is condensed and fits more per line.",
  },
  // Stroke-contrast ratio (thick/thin) at the regular weight, from google/fonts
  // quant.csv. Domain clipped at the catalog p1/p99 (1.02 / 8.52, computed
  // 2026-07-11); the long Didone tail past 8.5 still matches when the top thumb
  // rests on the edge. Value is already a ratio, so derive() passes it through.
  contrast: {
    key: "contrast",
    label: "Contrast",
    min: 1,
    max: 8.5,
    step: 0.05,
    scale: "linear",
    quantiles: [1.21, 1.32, 2.09],
    hint: "Stroke-weight difference between the thick and thin parts of letters, at the regular weight. Near 1.0 is monolinear (even strokes, most sans and mono); higher means sharper thick/thin contrast, up to Didone display serifs.",
  },
  // 16KB … 64MB, log-scaled. Stored/compared in raw bytes.
  fileSize: {
    key: "fileSize",
    label: "File size",
    min: 16 * 1024,
    max: 64 * 1024 * 1024,
    step: 1,
    scale: "log",
    quantiles: [72060, 153704, 353980],
    hint: "Byte size of the primary font file. Larger files usually carry more glyphs, more languages, or variable-font axes; smaller files load faster.",
  },
};

/** Humanize a byte count for the fileSize readout (e.g. 3.5MB, 512KB). */
function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}MB`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}

/** Format one metric value for display: fileSize as KB/MB, every other metric
 *  as a 2-dp ratio. Shared by the sidebar readouts/quartile pills and the
 *  active-filter chips so a range reads the same everywhere (see describe.ts). */
export function formatMetricValue(key: MetricKey, v: number): string {
  return key === "fileSize" ? humanBytes(v) : v.toFixed(2);
}

// The order the metrics render in the sidebar.
export const METRIC_ORDER: MetricKey[] = [
  "xHeight",
  "capHeight",
  "lineHeight",
  "avgWidth",
  "contrast",
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
    case "contrast":
      return font.contrast;
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

/** The four quartile ranges of a metric, from its p25/p50/p75 breakpoints:
 *  [min,p25], [p25,p50], [p50,p75], [p75,max]. Each holds ~1/4 of the catalog.
 *  Drives the Q1…Q4 quick-select pills under each slider. */
export function quartileRanges(spec: MetricSpec): MetricRange[] {
  const [q1, q2, q3] = spec.quantiles;
  return [
    [spec.min, q1],
    [q1, q2],
    [q2, q3],
    [q3, spec.max],
  ];
}

/** Whether a stored range equals a given quartile range (so its pill shows
 *  active and a second click clears it). Compared with a small epsilon since
 *  the values are stored rounded. */
export function rangesEqual(a: MetricRange, b: MetricRange): boolean {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

/** A range is active (filters anything) only when a thumb has moved off a
 *  domain edge. Inactive ranges are dropped from state and the URL. */
export function isRangeActive(
  spec: MetricSpec,
  [lo, hi]: MetricRange
): boolean {
  return lo > spec.min || hi < spec.max;
}

/** Per-catalog upm pill items: [value, family count], sorted by count desc
 *  then value asc. Drives the Units-per-em pill list in the Metrics tab. */
export function catalogUpmCounts(fonts: FontRecord[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const f of fonts)
    if (f.unitsPerEm != null && f.unitsPerEm > 0) {
      const k = String(f.unitsPerEm);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])
  );
}
