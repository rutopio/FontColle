import { type FilterState, FONT_TYPE_FACETS } from "./filter";

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

/** Multi-select toggle for a plain array key (classes, facets, features, …). */
export function toggle(
  filter: FilterState,
  key: keyof Omit<FilterState, "query">,
  value: string
): FilterState {
  const cur = filter[key];
  const next = cur.includes(value)
    ? cur.filter((x) => x !== value)
    : [...cur, value];
  return { ...filter, [key]: next };
}

/** Variable-axis toggle: selecting wght/wdth clears the matching Weight/Width
 *  selection (they're mutually exclusive); other axes toggle normally. */
export function toggleAxis(filter: FilterState, tag: string): FilterState {
  const turningOn = !filter.axes.includes(tag);
  const nextAxes = turningOn
    ? [...filter.axes, tag]
    : filter.axes.filter((x) => x !== tag);
  const cleared = turningOn ? AXIS_EXCLUSIVE[tag] : undefined;
  return {
    ...filter,
    axes: nextAxes,
    ...(cleared ? { [cleared]: [] } : {}),
  };
}

/** Radio-style select for Weight/Width: at most one value; clicking the current
 *  selection clears it. Selecting one also clears the mutually exclusive
 *  variable axis (wght/wdth). */
export function select(
  filter: FilterState,
  key: "weights" | "widths",
  value: string
): FilterState {
  const turningOn = !filter[key].includes(value);
  const next = turningOn ? [value] : [];
  const axisTag = EXCLUSIVE_AXIS[key];
  return {
    ...filter,
    [key]: next,
    axes: turningOn ? filter.axes.filter((x) => x !== axisTag) : filter.axes,
  };
}

// Picking a color format already implies Colorful (only a font with a color
// table can carry one), so Colorful shows selected without duplicating it into
// filter.color — applyFilters would just narrow the same way twice.
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

// Static/Variable live in `facets`, which is AND-ed — selecting both would
// always return nothing. They behave radio-style, leaving the other facets
// (ligatures, fractions, …) untouched.
function withoutFontType(filter: FilterState): string[] {
  return filter.facets.filter((f) => !FONT_TYPE_FACETS.includes(f));
}

// Picking a variable axis already implies Variable (only a variable font has
// axes), so Variable shows selected without duplicating it into `facets`.
// Mirrors how a color format implies Colorful.
/** The font-type values to show as selected, folding in the axis-implied Variable. */
export function fontTypeSelection(filter: FilterState): string[] {
  return filter.axes.length > 0
    ? ["variable"]
    : filter.facets.filter((f) => FONT_TYPE_FACETS.includes(f));
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
    return { ...filter, facets: base, axes: [] };
  }
  const turningOff = filter.facets.includes(value);
  const facets = turningOff ? base : [...base, value];
  return {
    ...filter,
    facets,
    axes: facets.includes("static") ? [] : filter.axes,
  };
}

/** Reset the Font type section: clear its facets and the implied axes. */
export function resetFontType(filter: FilterState): FilterState {
  return { ...filter, facets: withoutFontType(filter), axes: [] };
}

/** Clear only the values a given section shows. Several sections share one
 *  FilterState key (Properties and Font type both live in `facets`), so scope
 *  the reset to the items that section actually renders. */
export function clearSection(
  filter: FilterState,
  key: keyof Omit<FilterState, "query">,
  items: [string, number][]
): FilterState {
  const own = new Set(items.map(([v]) => v));
  return { ...filter, [key]: filter[key].filter((v) => !own.has(v)) };
}
