import {
  type FilterState,
  FONT_TYPE_FACETS,
  MODE_KEYS,
  type ModeKey,
  SECTION_DEFAULT_MODE,
} from "./filter";

// Drop the OR/AND override of any mode section that no longer holds a value. A
// section's combine mode only means something while it has >= 2 selected values;
// once it's empty the override is invisible state that would otherwise ride
// along in the URL (a "pristine" filter carrying ?mode=tags:any) and silently
// re-apply the next time that section is used. Called at the tail of every
// action that can empty a mode section, so clearing always fully resets it.
function pruneEmptyModes(f: FilterState): FilterState {
  const stale = MODE_KEYS.filter(
    (k) => f.matchModes[k] != null && f[k].length === 0
  );
  if (stale.length === 0) return f;
  const matchModes = { ...f.matchModes };
  for (const k of stale) delete matchModes[k];
  return { ...f, matchModes };
}

// The FilterState fields that hold a plain string[], i.e. the ones toggle/
// clearSection operate on. Excludes `metrics` (object) and the boolean facets.
type ArrayKey =
  | "classes"
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

// Pure filter-state transitions, lifted out of FilterSidebar so the app's
// trickiest rules (mutual exclusion, implied selections, scoped resets) live in
// one testable place. Every function takes the current filter and returns the
// next one; the component just wires callbacks to them.

// A variable axis and its equivalent value section drive the same thing, so
// they're mutually exclusive: the wght axis vs the Weight steps, wdth vs Width.
// Selecting one clears the other.
const AXIS_EXCLUSIVE: Record<string, "weights" | "widths"> = {
  wght: "weights",
  wdth: "widths",
};
const EXCLUSIVE_AXIS: Record<"weights" | "widths", string> = {
  weights: "wght",
  widths: "wdth",
};

/** Multi-select toggle for a plain array key (classes, facets, features, …).
 *  New picks append to the tail, so the last-clicked value is always last in
 *  the array — the preview reads that end to render the most recent pick. */
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

/** Variable-axis toggle: selecting wght/wdth clears the matching Weight/Width
 *  selection (they're mutually exclusive); other axes toggle normally. */
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

/** Multi-select for Weight/Width. New picks append to the tail so the preview
 *  can render the last one clicked; re-clicking a selected step removes it.
 *  Turning a step on clears the mutually exclusive variable axis (wght/wdth),
 *  which drives the same thing. Combine mode (AND by default) lives in
 *  match-mode; this action only edits the value list. */
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

// Picking a color format already implies Colorful (only a font with a color
// table can carry one), so Colorful shows selected without duplicating it into
// filter.color, applyFilters would just narrow the same way twice.
/** The color values to show as selected, folding in the format-implied Colorful. */
export function colorSelection(filter: FilterState): string[] {
  return filter.colorFormats.length > 0 ? ["color"] : filter.color;
}

/** Color is radio-style. Two couplings with the format pills:
 *   - Monochrome clears them (a monochrome font has no color table, so leaving
 *     them set would filter everything out from a now-disabled control).
 *   - Clicking the format-implied Colorful clears them too, since that implied
 *     selection is the only thing making it look selected. */
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

// Static/Variable live in `tags`, which is AND-ed, selecting both would
// always return nothing. They behave radio-style, leaving the other tags
// (ligatures, fractions, …) untouched.
function withoutFontType(filter: FilterState): string[] {
  return filter.tags.filter((f) => !FONT_TYPE_FACETS.includes(f));
}

// Picking a variable axis already implies Variable (only a variable font has
// axes), so Variable shows selected without duplicating it into `tags`.
// Mirrors how a color format implies Colorful.
/** The font-type values to show as selected, folding in the axis-implied Variable. */
export function fontTypeSelection(filter: FilterState): string[] {
  return filter.axes.length > 0
    ? ["variable"]
    : filter.tags.filter((f) => FONT_TYPE_FACETS.includes(f));
}

/** Radio-style Static/Variable. Two couplings with the variable axes:
 *   - Static clears them (a static font has no axes).
 *   - Clicking the axis-implied Variable clears them too. */
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

/** Reset the Font type section: clear its font-type tags and the implied axes. */
export function resetFontType(filter: FilterState): FilterState {
  return pruneEmptyModes({
    ...filter,
    tags: withoutFontType(filter),
    axes: [],
  });
}

/** Radio-style Source select (Noto / Others): at most one value; re-clicking
 *  the active one clears it. Stored in `flags` as a 0- or 1-length array. */
export function selectFlag(filter: FilterState, value: string): FilterState {
  const next = filter.flags.includes(value) ? [] : [value];
  return { ...filter, flags: next };
}

/** Radio-style Italic select (Italic / Non-Italic): at most one value;
 *  re-clicking the active one clears it. Stored in `italic`. */
export function selectItalic(filter: FilterState, value: string): FilterState {
  const next = filter.italic.includes(value) ? [] : [value];
  return { ...filter, italic: next };
}

/** Flip a section's OR/AND mode. Stores the override only while it differs from
 *  the section default, so returning to the default drops the entry (keeping a
 *  pristine filter's matchModes empty). */
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

/** Clear only the values a given section shows. Sections can share one
 *  FilterState key (Style and Mood both live in `style`), so scope the reset
 *  to the items that section actually renders. */
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
