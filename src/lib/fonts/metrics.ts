// One place the sidebar sliders and applyFilters both read from, so the ratios
// they compare are computed identically.
import type { FontRecord } from "./types";

export type MetricKey =
  | "xHeight"
  | "capHeight"
  | "lineHeight"
  | "avgWidth"
  | "contrast"
  | "fileSize";

export type MetricRange = [number, number];

export interface MetricSpec {
  key: MetricKey;
  label: string;
  // The domains deliberately clip outliers, so a thumb resting on an edge means
  // "unbounded on that side" and a full-extent slider excludes nothing.
  min: number;
  max: number;
  step: number;
  scale: "linear" | "log";
  // p25/p50/p75 over the published catalog, driving the four quartile pills so
  // each holds ~1/4 of the fonts (an even split of the clipped domain would
  // leave the edge buckets near-empty).
  quantiles: [number, number, number];
  hint: string; // shown in the metric's info-icon tooltip
}

// Domains sized from the p1/median/p99 distribution over the catalog, so the
// sliders resolve the dense middle while clipping the long tails.
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
  // Already a ratio, so derive() passes it through. The long Didone tail past
  // the 8.5 clip still matches when the top thumb rests on the edge.
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

function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}MB`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}

/** Shared, so a range reads the same in the readouts and the chips. */
export function formatMetricValue(key: MetricKey, v: number): string {
  return key === "fileSize" ? humanBytes(v) : v.toFixed(2);
}

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

/** Null when a required raw field is missing. */
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

/** A thumb on the domain edge is unbounded on that side, so outliers past it
 *  still match. A null derived value never matches. */
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

export function quartileRanges(spec: MetricSpec): MetricRange[] {
  const [q1, q2, q3] = spec.quantiles;
  return [
    [spec.min, q1],
    [q1, q2],
    [q2, q3],
    [q3, spec.max],
  ];
}

/** Epsilon compare, since the stored values are rounded. */
export function rangesEqual(a: MetricRange, b: MetricRange): boolean {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

/** Only a thumb off a domain edge filters anything. Inactive ranges are
 *  dropped from state and the URL. */
export function isRangeActive(
  spec: MetricSpec,
  [lo, hi]: MetricRange
): boolean {
  return lo > spec.min || hi < spec.max;
}

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
