import {
  type FilterState,
  FONT_TYPE_FACETS,
  MODE_KEYS,
  type ModeKey,
  SECTION_DEFAULT_MODE,
} from "./filter";

function pruneEmptyModes(f: FilterState): FilterState {
  const stale = MODE_KEYS.filter(
    (k) => f.matchModes[k] != null && f[k].length === 0
  );
  if (stale.length === 0) return f;
  const matchModes = { ...f.matchModes };
  for (const k of stale) delete matchModes[k];
  return { ...f, matchModes };
}

type ArrayKey =
  | "categories"
  | "tags"
  | "features"
  | "axes"
  | "weights"
  | "widths"
  | "scripts"
  | "languages"
  | "color"
  | "colorFormats"
  | "style"
  | "designers"
  | "vendors"
  | "license"
  | "repoHosts"
  | "activity"
  | "upm";

const AXIS_EXCLUSIVE: Record<string, "weights" | "widths"> = {
  wght: "weights",
  wdth: "widths",
};
const EXCLUSIVE_AXIS: Record<"weights" | "widths", string> = {
  weights: "wght",
  widths: "wdth",
};

export function toggle(
  filter: FilterState,
  key: ArrayKey,
  value: string
): FilterState {
  const cur = filter[key];
  const next = cur.includes(value)
    ? cur.filter((x) => x !== value)
    : [...cur, value];
  return pruneEmptyModes({ ...filter, [key]: next });
}

export function toggleAxis(filter: FilterState, tag: string): FilterState {
  const turningOn = !filter.axes.includes(tag);
  const nextAxes = turningOn
    ? [...filter.axes, tag]
    : filter.axes.filter((x) => x !== tag);
  const cleared = turningOn ? AXIS_EXCLUSIVE[tag] : undefined;
  return pruneEmptyModes({
    ...filter,
    axes: nextAxes,
    ...(cleared ? { [cleared]: [] } : {}),
  });
}

export function select(
  filter: FilterState,
  key: "weights" | "widths",
  value: string
): FilterState {
  const cur = filter[key];
  const turningOn = !cur.includes(value);
  const next = turningOn ? [...cur, value] : cur.filter((x) => x !== value);
  const axisTag = EXCLUSIVE_AXIS[key];
  return pruneEmptyModes({
    ...filter,
    [key]: next,
    axes: turningOn ? filter.axes.filter((x) => x !== axisTag) : filter.axes,
  });
}

export function colorSelection(filter: FilterState): string[] {
  return filter.colorFormats.length > 0 ? ["color"] : filter.color;
}

export function selectColor(filter: FilterState, value: string): FilterState {
  const colorImpliedByFormat = filter.colorFormats.length > 0;
  if (value === "color" && colorImpliedByFormat) {
    return { ...filter, color: [], colorFormats: [] };
  }
  const next = filter.color.includes(value) ? [] : [value];
  return {
    ...filter,
    color: next,
    colorFormats: next.includes("monochrome") ? [] : filter.colorFormats,
  };
}

function withoutFontType(filter: FilterState): string[] {
  return filter.tags.filter((f) => !FONT_TYPE_FACETS.includes(f));
}

export function fontTypeSelection(filter: FilterState): string[] {
  return filter.axes.length > 0
    ? ["variable"]
    : filter.tags.filter((f) => FONT_TYPE_FACETS.includes(f));
}

export function selectFontType(
  filter: FilterState,
  value: string
): FilterState {
  const base = withoutFontType(filter);
  const variableImpliedByAxes = filter.axes.length > 0;
  if (value === "variable" && variableImpliedByAxes) {
    return pruneEmptyModes({ ...filter, tags: base, axes: [] });
  }
  const turningOff = filter.tags.includes(value);
  const tags = turningOff ? base : [...base, value];
  return pruneEmptyModes({
    ...filter,
    tags,
    axes: tags.includes("static") ? [] : filter.axes,
  });
}

export function resetFontType(filter: FilterState): FilterState {
  return pruneEmptyModes({
    ...filter,
    tags: withoutFontType(filter),
    axes: [],
  });
}

export function selectFlag(filter: FilterState, value: string): FilterState {
  const next = filter.source.includes(value) ? [] : [value];
  return { ...filter, source: next };
}

export function selectItalic(filter: FilterState, value: string): FilterState {
  const next = filter.italic.includes(value) ? [] : [value];
  return { ...filter, italic: next };
}

export function selectSpacing(filter: FilterState, value: string): FilterState {
  const next = filter.spacing.includes(value) ? [] : [value];
  return { ...filter, spacing: next };
}

export function toggleMatchMode(
  filter: FilterState,
  key: ModeKey
): FilterState {
  const current = filter.matchModes[key] ?? SECTION_DEFAULT_MODE[key];
  const next = current === "any" ? "all" : "any";
  const matchModes = { ...filter.matchModes };
  if (next === SECTION_DEFAULT_MODE[key]) delete matchModes[key];
  else matchModes[key] = next;
  return { ...filter, matchModes };
}

export function clearSection(
  filter: FilterState,
  key: ArrayKey,
  items: [string, number][]
): FilterState {
  const own = new Set(items.map(([v]) => v));
  return pruneEmptyModes({
    ...filter,
    [key]: filter[key].filter((v) => !own.has(v)),
  });
}
