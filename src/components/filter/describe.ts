import { colorFormatLabel } from "@/lib/fonts/color";
import {
  ACTIVITY_LABELS,
  CLASSIFICATION_SECTIONS,
  classificationGroupOf,
  type FilterState,
  FLAG_LABELS,
  INSTANCE_BUCKETS,
  ITALIC_LABELS,
  instanceBucketOf,
  MODE_KEYS,
  type ModeKey,
  matchMode,
  REPO_HOST_LABELS,
  REPO_STATUS_LABELS,
  SPACING_LABELS,
} from "@/lib/fonts/filter";
import { languageLabel, scriptLabel, vendorLabel } from "@/lib/fonts/labels";
import {
  formatMetricValue,
  METRIC_SPECS,
  type MetricKey,
} from "@/lib/fonts/metrics";
import { facetLabel, subTagLabel, weightLabel, widthLabel } from "./constants";

const classificationSubList = (path: string): string =>
  CLASSIFICATION_SECTIONS.find((s) => path.startsWith(s.prefix))?.title ?? "";

const classificationSection = (path: string): string =>
  classificationGroupOf(path) === "mood" ? "Mood" : "Style";

const classificationValue = (path: string): string => {
  const subList = classificationSubList(path);
  const label = subTagLabel(path);
  return subList ? `${subList}: ${label}` : label;
};

export interface FilterChip {
  id: string;
  section: string;
  value: string;
  key: keyof FilterState;
  rawValue?: string;
}

const COLOR_LABEL: Record<string, string> = {
  color: "Colorful",
  monochrome: "Monochrome",
};

export function describeActiveFilters(f: FilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  const push = (
    id: string,
    section: string,
    value: string,
    key: keyof FilterState,
    rawValue: string
  ) => chips.push({ id, section, value, key, rawValue });

  for (const v of f.categories)
    push(`category:${v}`, "Category", v, "categories", v);
  for (const v of f.tags)
    push(`facet:${v}`, "Font type", facetLabel(v), "tags", v);
  for (const v of f.style)
    push(
      `cls:${v}`,
      classificationSection(v),
      classificationValue(v),
      "style",
      v
    );
  for (const v of f.color)
    push(`color:${v}`, "Color", COLOR_LABEL[v] ?? v, "color", v);
  for (const v of f.colorFormats)
    push(`cfmt:${v}`, "Format", colorFormatLabel(v), "colorFormats", v);
  for (const v of f.scripts)
    push(`script:${v}`, "Writing system", scriptLabel(v), "scripts", v);
  for (const v of f.languages)
    push(`lang:${v}`, "Language", languageLabel(v), "languages", v);
  for (const v of f.weights)
    push(`weight:${v}`, "Weight", weightLabel(v), "weights", v);
  for (const v of f.widths)
    push(`width:${v}`, "Width", widthLabel(v), "widths", v);
  for (const v of f.axes) push(`axis:${v}`, "Variable axes", v, "axes", v);
  for (const v of f.features) push(`feat:${v}`, "Features", v, "features", v);
  for (const v of f.designers) push(`dsr:${v}`, "Designer", v, "designers", v);
  for (const v of f.vendors)
    push(`vnd:${v}`, "Vendor", vendorLabel(v), "vendors", v);
  for (const v of f.source)
    push(`source:${v}`, "Noto Family", FLAG_LABELS[v] ?? v, "source", v);
  for (const v of f.license) push(`lic:${v}`, "License", v, "license", v);
  for (const v of f.repoHosts)
    push(`repo:${v}`, "Repository", REPO_HOST_LABELS[v] ?? v, "repoHosts", v);
  for (const v of f.repoStatus)
    push(
      `repostatus:${v}`,
      "Repo status",
      REPO_STATUS_LABELS[v] ?? v,
      "repoStatus",
      v
    );
  for (const v of f.activity)
    push(`act:${v}`, "Last updated", ACTIVITY_LABELS[v] ?? v, "activity", v);
  for (const v of f.italic)
    push(`ital:${v}`, "Italic & Slant", ITALIC_LABELS[v] ?? v, "italic", v);
  for (const v of f.spacing)
    push(`spacing:${v}`, "Spacing", SPACING_LABELS[v] ?? v, "spacing", v);
  for (const v of f.upm) push(`upm:${v}`, "Units per em", v, "upm", v);
  if (f.instances) {
    const id = instanceBucketOf(f.instances);
    const bucket = INSTANCE_BUCKETS.find((b) => b.id === id);
    const [lo, hi] = f.instances;
    chips.push({
      id: "inst",
      section: "Instances",
      value: bucket ? bucket.label : lo === hi ? String(lo) : `${lo}–${hi}`,
      key: "instances",
    });
  }

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
      value: f.hasHinting ? "Hinted" : "Unhinted",
      key: "hasHinting",
    });

  return chips;
}

const MODE_KEY_SET = new Set<string>(MODE_KEYS);

function sectionJoiner(f: FilterState, key: keyof FilterState): "and" | "or" {
  if (MODE_KEY_SET.has(key as string))
    return matchMode(f, key as ModeKey) === "all" ? "and" : "or";
  return "or";
}

export interface FilterChipGroup {
  id: string;
  section: string;
  values: { id: string; value: string }[];
  joiner: "and" | "or";
  removeAll: FilterState;
}

export function groupActiveFilters(f: FilterState): FilterChipGroup[] {
  const groups: FilterChipGroup[] = [];
  const bySection = new Map<
    string,
    { group: FilterChipGroup; chips: FilterChip[] }
  >();

  for (const chip of describeActiveFilters(f)) {
    let entry = bySection.get(chip.section);
    if (!entry) {
      const group: FilterChipGroup = {
        id: chip.section,
        section: chip.section,
        values: [],
        joiner: sectionJoiner(f, chip.key),
        removeAll: f,
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
