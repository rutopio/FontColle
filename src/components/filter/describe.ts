import { colorFormatLabel } from "@/lib/fonts/color";
import { featureName } from "@/lib/fonts/features";
import {
  ACTIVITY_LABELS,
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

// One active-filter chip: what to show and enough to remove it. Grouping is by
// display section; `key` + `rawValue` say which FilterState field the condition
// lives in and its stored value, so a whole section can be cleared as a unit
// without recovering the value from the display id.
export interface FilterChip {
  // Stable per condition, for React keys.
  id: string;
  // Short section name shown as a muted prefix ("Weight", "Script"…).
  section: string;
  // Human-readable value.
  value: string;
  // The FilterState field this condition lives in, so chips of one section can
  // be grouped and cleared together, and the section's OR/AND joiner resolved.
  key: keyof FilterState;
  // The stored value in that field (the array entry, or the metric key). Absent
  // for the boolean `hasHinting`, which has no per-value identity.
  rawValue?: string;
}

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
    key: keyof FilterState,
    rawValue: string
  ) => chips.push({ id, section, value, key, rawValue });

  for (const v of f.classes) push(`class:${v}`, "Category", v, "classes", v);
  for (const v of f.facets) push(`facet:${v}`, "Properties", v, "facets", v);
  for (const v of f.classifications)
    push(
      `cls:${v}`,
      classificationSection(v),
      subTagLabel(v),
      "classifications",
      v
    );
  for (const v of f.color)
    push(`color:${v}`, "Color", COLOR_LABEL[v] ?? v, "color", v);
  for (const v of f.colorFormats)
    push(`cfmt:${v}`, "Color format", colorFormatLabel(v), "colorFormats", v);
  for (const v of f.scripts)
    push(`script:${v}`, "Writing system", scriptLabel(v), "scripts", v);
  for (const v of f.languages)
    push(`lang:${v}`, "Language", languageLabel(v), "languages", v);
  for (const v of f.weights)
    push(`weight:${v}`, "Weight", weightLabel(v), "weights", v);
  for (const v of f.widths)
    push(`width:${v}`, "Width", widthLabel(v), "widths", v);
  for (const v of f.axes) push(`axis:${v}`, "Variable axes", v, "axes", v);
  for (const v of f.features)
    push(`feat:${v}`, "Features", featureName(v), "features", v);
  for (const v of f.designers) push(`dsr:${v}`, "Designer", v, "designers", v);
  for (const v of f.vendors)
    push(`vnd:${v}`, "Vendor", vendorLabel(v), "vendors", v);
  for (const v of f.license) push(`lic:${v}`, "License", v, "license", v);
  for (const v of f.repoHosts)
    push(`repo:${v}`, "Source Repo", REPO_HOST_LABELS[v] ?? v, "repoHosts", v);
  for (const v of f.activity)
    push(`act:${v}`, "Activity", ACTIVITY_LABELS[v] ?? v, "activity", v);
  for (const v of f.italic)
    push(
      `ital:${v}`,
      "Italic",
      v === "italic" ? "Italic" : "Non-Italic",
      "italic",
      v
    );
  for (const v of f.upm) push(`upm:${v}`, "Units per em", v, "upm", v);

  for (const key of Object.keys(f.metrics) as MetricKey[]) {
    const range = f.metrics[key];
    if (!range) continue;
    const label = `${formatMetricValue(key, range[0])}–${formatMetricValue(key, range[1])}`;
    push(`metric:${key}`, METRIC_SPECS[key].label, label, "metrics", key);
  }

  if (f.hasHinting !== undefined)
    chips.push({
      id: "hint",
      section: "Hint",
      value: f.hasHinting ? "Hinted" : "No Hinted",
      key: "hasHinting",
    });

  return chips;
}

// Which combine word joins a section's values in its chip. Only the toggleable
// sections vary — they read their live OR/AND mode; every other multi-value
// section combines with OR in applyFilters, so it reads "or". (Metric ranges,
// the one AND section, each have a distinct label and never share a chip, so no
// AND joiner is ever rendered.)
const MODE_KEY_SET = new Set<string>(MODE_KEYS);

function sectionJoiner(f: FilterState, key: keyof FilterState): "and" | "or" {
  if (MODE_KEY_SET.has(key as string))
    return matchMode(f, key as ModeKey) === "all" ? "and" : "or";
  return "or";
}

// One active-filter section: all its chips folded into a single group, with the
// joiner word between values and a filter that drops the whole section at once.
export interface FilterChipGroup {
  // Stable key for React, = the display section name.
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
  const groups: FilterChipGroup[] = [];
  const bySection = new Map<
    string,
    { group: FilterChipGroup; chips: FilterChip[] }
  >();

  // Group by the displayed section name, not the state key: the classification
  // key holds several visually distinct sections (Serif, Sans, Expressive…),
  // and each should read and clear as its own chip.
  for (const chip of describeActiveFilters(f)) {
    let entry = bySection.get(chip.section);
    if (!entry) {
      const group: FilterChipGroup = {
        id: chip.section,
        section: chip.section,
        values: [],
        joiner: sectionJoiner(f, chip.key),
        removeAll: f, // finalized below once the section's chips are known
      };
      entry = { group, chips: [] };
      bySection.set(chip.section, entry);
      groups.push(group);
    }
    entry.group.values.push({ id: chip.id, value: chip.value });
    entry.chips.push(chip);
  }

  for (const { group, chips } of bySection.values())
    group.removeAll = removeSection(f, chips);
  return groups;
}

// Clear a whole section at once. Every chip in a section shares one state field;
// array fields drop just this section's values (so a sibling section on the same
// `classifications` key survives), and the two scalar fields reset outright.
function removeSection(f: FilterState, chips: FilterChip[]): FilterState {
  const key = chips[0].key;
  if (key === "hasHinting") return { ...f, hasHinting: undefined };
  if (key === "metrics") {
    const metrics = { ...f.metrics };
    for (const chip of chips) delete metrics[chip.rawValue as MetricKey];
    return { ...f, metrics };
  }
  const drop = new Set(chips.map((c) => c.rawValue));
  return { ...f, [key]: (f[key] as string[]).filter((v) => !drop.has(v)) };
}
