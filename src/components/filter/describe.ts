import { colorFormatLabel } from "@/lib/fonts/color";
import { featureName } from "@/lib/fonts/features";
import { CLASSIFICATION_SECTIONS, type FilterState } from "@/lib/fonts/filter";
import { languageLabel, scriptLabel, vendorLabel } from "@/lib/fonts/labels";
import {
  formatMetricValue,
  METRIC_SPECS,
  type MetricKey,
} from "@/lib/fonts/metrics";
import { subTagLabel, weightLabel, widthLabel } from "./constants";

// The classification section a tag path belongs to ("/Serif/Old Style Garalde"
// -> "Serif"), so its chip reads with the same section name the sidebar shows.
const classificationSection = (path: string): string =>
  CLASSIFICATION_SECTIONS.find((s) => path.startsWith(s.prefix))?.title ??
  "Style";

// One active-filter chip: what to show, and how to remove just this condition.
export interface FilterChip {
  // Stable per condition, for React keys.
  id: string;
  // Short section name shown as a muted prefix ("Weight", "Script"…).
  section: string;
  // Human-readable value.
  value: string;
  // The filter with only this one condition cleared.
  remove: FilterState;
}

// Drop a single value from a string[] field.
const without = (
  f: FilterState,
  key: keyof FilterState,
  value: string
): FilterState => ({
  ...f,
  [key]: (f[key] as string[]).filter((v) => v !== value),
});

const COLOR_LABEL: Record<string, string> = {
  color: "Colorful",
  monochrome: "Monochrome",
};

// Flatten every active condition into chips, in the sidebar's section order.
// The text query is intentionally excluded: it has its own input to clear.
export function describeActiveFilters(f: FilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  const push = (
    id: string,
    section: string,
    value: string,
    remove: FilterState
  ) => chips.push({ id, section, value, remove });

  for (const v of f.classes)
    push(`class:${v}`, "Category", v, without(f, "classes", v));
  for (const v of f.facets)
    push(`facet:${v}`, "Properties", v, without(f, "facets", v));
  for (const v of f.classifications)
    push(
      `cls:${v}`,
      classificationSection(v),
      subTagLabel(v),
      without(f, "classifications", v)
    );
  for (const v of f.color)
    push(`color:${v}`, "Color", COLOR_LABEL[v] ?? v, without(f, "color", v));
  for (const v of f.colorFormats)
    push(
      `cfmt:${v}`,
      "Color format",
      colorFormatLabel(v),
      without(f, "colorFormats", v)
    );
  for (const v of f.scripts)
    push(
      `script:${v}`,
      "Writing system",
      scriptLabel(v),
      without(f, "scripts", v)
    );
  for (const v of f.languages)
    push(`lang:${v}`, "Language", languageLabel(v), without(f, "languages", v));
  for (const v of f.weights)
    push(`weight:${v}`, "Weight", weightLabel(v), without(f, "weights", v));
  for (const v of f.widths)
    push(`width:${v}`, "Width", widthLabel(v), without(f, "widths", v));
  for (const v of f.axes)
    push(`axis:${v}`, "Variable axes", v, without(f, "axes", v));
  for (const v of f.features)
    push(
      `feat:${v}`,
      "OpenType features",
      featureName(v),
      without(f, "features", v)
    );
  for (const v of f.designers)
    push(`dsr:${v}`, "Designer", v, without(f, "designers", v));
  for (const v of f.vendors)
    push(`vnd:${v}`, "Vendor", vendorLabel(v), without(f, "vendors", v));
  for (const v of f.license)
    push(`lic:${v}`, "License", v, without(f, "license", v));

  for (const v of f.upm)
    push(`upm:${v}`, "Units per em", v, without(f, "upm", v));

  for (const key of Object.keys(f.metrics) as MetricKey[]) {
    const range = f.metrics[key];
    if (!range) continue;
    const { [key]: _, ...rest } = f.metrics;
    const label = `${formatMetricValue(key, range[0])}–${formatMetricValue(key, range[1])}`;
    push(`metric:${key}`, METRIC_SPECS[key].label, label, {
      ...f,
      metrics: rest,
    });
  }

  if (f.hasHinting !== undefined)
    push("hint", "Hint", f.hasHinting ? "Hinted" : "No Hinted", {
      ...f,
      hasHinting: undefined,
    });

  return chips;
}
