// Chrome shared by every control that sits in a rail. Per-site active/hover
// colours stay at the call sites, which genuinely differ.
//
// Class strings are written out in full rather than assembled from a shared
// variable: Tailwind only scans for whole class names.

// `transform` must be listed explicitly; transition-colors doesn't cover it.
const RAIL_BTN_CHROME =
  "cursor-pointer rounded-md outline-none transition-[color,background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-snap)] focus-visible:ring-2 focus-visible:ring-sidebar-ring active:scale-[0.96]";

// Phosphor weight is a prop, not CSS, so the hover-bold icons are twins shown
// and hidden by this group rather than restyled.
const RAIL_BTN_BASE = `group/rail-btn ${RAIL_BTN_CHROME}`;

const RAIL_TILE = "relative flex flex-col items-center gap-1 py-2";

export const RAIL_BTN = `${RAIL_BTN_BASE} ${RAIL_TILE}`;

export const RAIL_BAR_BTN = `${RAIL_BTN_BASE} flex size-11 items-center justify-center`;

// No group of its own: the cell below owns group/rail-btn, so the icon swap
// fires with the cell's hover tint, and a second group of the same name here
// would shadow it. min-w-0 lets the caption truncate rather than widen the cell.
export const RAIL_HEADER_BTN = `${RAIL_BTN_CHROME} ${RAIL_TILE} w-full min-w-0 px-1`;

// That cell. -mr-4 cancels the px-4 the header and preview footer carry; the
// width is fixed, not a floor, so every cell in a run matches.
export const RAIL_HEADER_CELL =
  "group/rail-btn -mr-4 flex h-16 w-[calc(var(--sidebar-width-icon)-0.5rem)] shrink-0 items-center justify-center border-border border-l transition-colors hover:bg-muted";

// Desktop-only: a column header wraps to two rows on a narrow screen, where
// there is no fixed height to fill and no edge to sit flush against.
export const RAIL_HEADER_CELL_MD =
  "group/rail-btn flex shrink-0 items-center justify-center transition-colors md:-mr-4 md:h-16 md:w-[calc(var(--sidebar-width-icon)-0.5rem)] md:border-border md:border-l md:hover:bg-muted";

// Mid-row: no -mr-4, only the last control has an edge to sit flush against.
export const RAIL_HEADER_CELL_MID =
  "group/rail-btn flex shrink-0 items-center justify-center transition-colors md:h-16 md:w-[calc(var(--sidebar-width-icon)-0.5rem)] md:border-border md:border-l md:hover:bg-muted";

// Opens the row (the detail page's Back): -ml-4, rule on the right.
export const RAIL_HEADER_CELL_START =
  "group/rail-btn flex shrink-0 items-center justify-center transition-colors md:-ml-4 md:h-16 md:w-[calc(var(--sidebar-width-icon)-0.5rem)] md:border-border md:border-r md:hover:bg-muted";

export const RAIL_BTN_OFF = "hover:bg-sidebar-accent/50 hover:text-foreground";

export const RAIL_BTN_ON =
  "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12";
