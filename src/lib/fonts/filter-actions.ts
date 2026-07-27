import {
  type FilterState,
  FONT_TYPE_FACETS,
  MODE_KEYS,
  type ModeKey,
  SECTION_DEFAULT_MODE,
} from "./filter";

// Drop the OR/AND override of any section that no longer holds a value, or it
// becomes invisible state riding along in the URL (a "pristine" filter carrying
// ?mode=tags:any) that silently re-applies next time the section is used.
// Called at the tail of every action that can empty a mode section.
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

// Lifted out of FilterSidebar so the mutual exclusions and implied selections
// live in one testable place.

// A variable axis and its equivalent value section drive the same thing, so
// they're mutually exclusive: wght vs the Weight steps, wdth vs Width.
const AXIS_EXCLUSIVE: Record<string, "weights" | "widths"> = {
  wght: "weights",
  wdth: "widths",
};
const EXCLUSIVE_AXIS: Record<"weights" | "widths", string> = {
  weights: "wght",
  widths: "wdth",
};

/** Appends to the tail: the preview reads that end for the latest pick. */
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

/** Selecting wght/wdth clears the matching Weight/Width selection. */
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

/** Turning a step on clears the mutually exclusive variable axis. */
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

/** A color format already implies Colorful, so it shows selected without
 *  duplicating into filter.color, which would narrow the same way twice. */
export function colorSelection(filter: FilterState): string[] {
  return filter.colorFormats.length > 0 ? ["color"] : filter.color;
}

/** Radio-style. Two couplings with the format pills: Monochrome clears them (a
 *  monochrome font has no color table, so they would filter everything out from
 *  a now-disabled control), and so does clicking the format-implied Colorful. */
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

// Static/Variable live in `tags`, which is AND-ed, so selecting both would
// always return nothing. Leaves the other tags untouched.
function withoutFontType(filter: FilterState): string[] {
  return filter.tags.filter((f) => !FONT_TYPE_FACETS.includes(f));
}

/** A variable axis already implies Variable, mirroring colorSelection. */
export function fontTypeSelection(filter: FilterState): string[] {
  return filter.axes.length > 0
    ? ["variable"]
    : filter.tags.filter((f) => FONT_TYPE_FACETS.includes(f));
}

/** Static clears the axes, and so does clicking the axis-implied Variable. */
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

/** Radio-style: re-clicking the active value clears it. */
export function selectFlag(filter: FilterState, value: string): FilterState {
  const next = filter.flags.includes(value) ? [] : [value];
  return { ...filter, flags: next };
}

/** Radio-style: re-clicking the active value clears it. */
export function selectItalic(filter: FilterState, value: string): FilterState {
  const next = filter.italic.includes(value) ? [] : [value];
  return { ...filter, italic: next };
}

/** Returning to the section default drops the entry entirely. */
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

/** Sections can share one FilterState key (Style and Mood both live in
 *  `style`), so the reset is scoped to the items that section renders. */
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
