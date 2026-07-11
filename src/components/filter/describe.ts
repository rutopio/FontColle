import { colorFormatLabel } from "@/lib/fonts/color";
import { featureName } from "@/lib/fonts/features";
import {
  CLASSIFICATION_SECTIONS,
  type FilterState,
  MODE_KEYS,
  type ModeKey,
  matchMode,
  REPO_HOST_LABELS,
} from "@/lib/fonts/filter";
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
  // The FilterState field this condition lives in, so chips of one section can
  // be grouped and cleared together, and the section's OR/AND joiner resolved.
  key: keyof FilterState;
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
    remove: FilterState,
    key: keyof FilterState
  ) => chips.push({ id, section, value, remove, key });

  for (const v of f.classes)
    push(`class:${v}`, "Category", v, without(f, "classes", v), "classes");
  for (const v of f.facets)
    push(`facet:${v}`, "Properties", v, without(f, "facets", v), "facets");
  for (const v of f.classifications)
    push(
      `cls:${v}`,
      classificationSection(v),
      subTagLabel(v),
      without(f, "classifications", v),
      "classifications"
    );
  for (const v of f.color)
    push(
      `color:${v}`,
      "Color",
      COLOR_LABEL[v] ?? v,
      without(f, "color", v),
      "color"
    );
  for (const v of f.colorFormats)
    push(
      `cfmt:${v}`,
      "Color format",
      colorFormatLabel(v),
      without(f, "colorFormats", v),
      "colorFormats"
    );
  for (const v of f.scripts)
    push(
      `script:${v}`,
      "Writing system",
      scriptLabel(v),
      without(f, "scripts", v),
      "scripts"
    );
  for (const v of f.languages)
    push(
      `lang:${v}`,
      "Language",
      languageLabel(v),
      without(f, "languages", v),
      "languages"
    );
  for (const v of f.weights)
    push(
      `weight:${v}`,
      "Weight",
      weightLabel(v),
      without(f, "weights", v),
      "weights"
    );
  for (const v of f.widths)
    push(
      `width:${v}`,
      "Width",
      widthLabel(v),
      without(f, "widths", v),
      "widths"
    );
  for (const v of f.axes)
    push(`axis:${v}`, "Variable axes", v, without(f, "axes", v), "axes");
  for (const v of f.features)
    push(
      `feat:${v}`,
      "Features",
      featureName(v),
      without(f, "features", v),
      "features"
    );
  for (const v of f.designers)
    push(`dsr:${v}`, "Designer", v, without(f, "designers", v), "designers");
  for (const v of f.vendors)
    push(
      `vnd:${v}`,
      "Vendor",
      vendorLabel(v),
      without(f, "vendors", v),
      "vendors"
    );
  for (const v of f.license)
    push(`lic:${v}`, "License", v, without(f, "license", v), "license");
  for (const v of f.repoHosts)
    push(
      `repo:${v}`,
      "Github",
      REPO_HOST_LABELS[v] ?? v,
      without(f, "repoHosts", v),
      "repoHosts"
    );

  for (const v of f.italic)
    push(
      `ital:${v}`,
      "Italic",
      v === "italic" ? "Italic" : "Non-Italic",
      without(f, "italic", v),
      "italic"
    );

  for (const v of f.upm)
    push(`upm:${v}`, "Units per em", v, without(f, "upm", v), "upm");

  for (const key of Object.keys(f.metrics) as MetricKey[]) {
    const range = f.metrics[key];
    if (!range) continue;
    const { [key]: _, ...rest } = f.metrics;
    const label = `${formatMetricValue(key, range[0])}–${formatMetricValue(key, range[1])}`;
    push(
      `metric:${key}`,
      METRIC_SPECS[key].label,
      label,
      { ...f, metrics: rest },
      "metrics"
    );
  }

  if (f.hasHinting !== undefined)
    push(
      "hint",
      "Hint",
      f.hasHinting ? "Hinted" : "No Hinted",
      { ...f, hasHinting: undefined },
      "hasHinting"
    );

  return chips;
}

// Which combine word joins a section's values in its chip. The seven toggleable
// sections read their live OR/AND mode; the rest are fixed by how applyFilters
// combines them (see apply.ts): most multi-value sections OR, a couple AND.
const AND_KEYS = new Set<keyof FilterState>(["metrics"]);
const MODE_KEY_SET = new Set<string>(MODE_KEYS);

function sectionJoiner(f: FilterState, key: keyof FilterState): "and" | "or" {
  if (MODE_KEY_SET.has(key as string))
    return matchMode(f, key as ModeKey) === "all" ? "and" : "or";
  return AND_KEYS.has(key) ? "and" : "or";
}

// One active-filter section: all its chips folded into a single group, with the
// joiner word between values and a filter that drops the whole section at once.
export interface FilterChipGroup {
  // Stable key for React, = the FilterState field.
  id: string;
  section: string;
  // The individual conditions, in the order describeActiveFilters emits them.
  values: { id: string; value: string }[];
  // "and" / "or", matching how the section combines (and the live mode toggle).
  joiner: "and" | "or";
  // The filter with this whole section cleared.
  removeAll: FilterState;
}

/** Group the flat chips by section so each renders as one chip whose values are
 *  joined by the section's combine word, removable as a unit. Preserves the flat
 *  emission order both across and within sections. */
export function groupActiveFilters(f: FilterState): FilterChipGroup[] {
  const chips = describeActiveFilters(f);
  const groups: FilterChipGroup[] = [];
  const bySection = new Map<string, FilterChipGroup>();

  // Group by the displayed section name, not the state key: the classification
  // key holds several visually distinct sections (Serif, Sans, Expressive…),
  // and each should read and clear as its own chip. Each section name maps to a
  // single state key, so removeAll folds only that section's own values.
  for (const chip of chips) {
    let group = bySection.get(chip.section);
    if (!group) {
      group = {
        id: chip.section,
        section: chip.section,
        values: [],
        joiner: sectionJoiner(f, chip.key),
        // Filled in below with the cumulative removal; a running fold keeps
        // clearing correct as each of the section's values is dropped.
        removeAll: f,
      };
      bySection.set(chip.section, group);
      groups.push(group);
    }
    group.values.push({ id: chip.id, value: chip.value });
    // Each chip's `remove` drops just its own value from the running state;
    // chain them so removeAll ends up with every value of the section gone.
    group.removeAll = removeFromState(group.removeAll, chip);
  }
  return groups;
}

// Apply one chip's removal onto an arbitrary base state (not `f`), so a section
// with several values folds down to "all of them cleared". Metric and hinting
// removals are keyed edits; array sections drop the one value.
function removeFromState(base: FilterState, chip: FilterChip): FilterState {
  if (chip.key === "metrics") {
    const metricKey = chip.id.slice("metric:".length) as MetricKey;
    const { [metricKey]: _, ...rest } = base.metrics;
    return { ...base, metrics: rest };
  }
  if (chip.key === "hasHinting") return { ...base, hasHinting: undefined };
  const value = chip.id.slice(chip.id.indexOf(":") + 1);
  return without(base, chip.key, value);
}
