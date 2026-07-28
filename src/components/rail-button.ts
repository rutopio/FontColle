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

export const RAIL_BTN_OFF = "hover:bg-sidebar-accent/50 hover:text-foreground";

export const RAIL_BTN = `${RAIL_BTN_BASE} ${RAIL_TILE}`;

export const RAIL_BAR_BTN = `${RAIL_BTN_BASE} flex size-11 items-center justify-center`;

// The same tile as RAIL_BTN, for a page header rather than the rail. It carries
// its own width because there is no bordered box around it to inset it: the
// rail's buttons come out 54px inside a 5rem column — p-2 either side plus the
// box's borders — and these have to measure the same to read as the same
// control. min-w-0 lets the caption truncate.
//
// No group of its own: the cell below owns group/rail-btn, so the icon-swap
// twins fire with this button's hover, and a second group of the same name here
// would shadow it.
export const RAIL_HEADER_BTN = `${RAIL_BTN_CHROME} ${RAIL_TILE} ${RAIL_BTN_OFF} w-[calc(var(--sidebar-width-icon)-1.625rem)] min-w-0 px-1`;

// The wrapper around it, which only has to hold the group and stay out of the
// way: the tile sizes and paints itself, exactly as in the rail. Runs of these
// set their own gap-1, matching the rail's.
export const RAIL_HEADER_CELL = "group/rail-btn flex shrink-0 items-center";

export const RAIL_BTN_ON =
  "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12";
