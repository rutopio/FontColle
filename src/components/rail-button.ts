// The icon-rail button chrome, shared by every control that sits in a rail:
// FavoriteToggle, ThemeToggle, AboutLink, FilterRail and the detail rail.
//
// This string was duplicated verbatim in six files, which is how all six ended
// up with no press feedback at once. Extracted so the press state has a single
// home; the per-site active/hover colours stay at the call sites, since those
// genuinely differ (a filter group highlights when selected, a theme toggle
// never does).
//
// active:scale-[0.96] is the press response. A rail button is small (~44px), so
// it takes the full button-sized scale rather than the gentler 0.99 the large
// font cards use — the same ratio has to travel a visible distance here.
// `transform` is listed explicitly in transition-[...]: `transition-colors`
// alone does not cover it, and the scale would snap instead of easing.

// Everything but the group name, which most variants declare on the button
// itself but the header one inherits from the cell around it.
const RAIL_BTN_CHROME =
  "cursor-pointer rounded-md outline-none transition-[color,background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-snap)] focus-visible:ring-2 focus-visible:ring-sidebar-ring active:scale-[0.96]";

// The hover-swapped icons inside these buttons (Phosphor weight is a prop, not
// CSS, so the twin is shown/hidden rather than restyled) watch this group.
const RAIL_BTN_BASE = `group/rail-btn ${RAIL_BTN_CHROME}`;

// The tile shared by the desktop rail and the column header: icon over caption.
const RAIL_TILE = "relative flex flex-col items-center gap-1 py-2";

// Desktop tile: icon stacked over a caption.
export const RAIL_BTN = `${RAIL_BTN_BASE} ${RAIL_TILE}`;

// Compact mobile top-bar icon button: no tile, no caption.
export const RAIL_BAR_BTN = `${RAIL_BTN_BASE} flex size-11 items-center justify-center`;

// Column-header button: the same tile as RAIL_BTN, but built to sit inside a
// full-height divider cell at the end of a header row (the preview field's Top
// button is the model). The cell owns both the hover tint — which covers the
// whole cell, not just the button's box — and the group/rail-btn name the icon
// swap watches, so that swap fires with the tint even when the pointer is in
// the cell but not on the button. Hence no group of its own here: a second,
// inner one of the same name would shadow the cell's for everything inside.
export const RAIL_HEADER_BTN = `${RAIL_BTN_CHROME} ${RAIL_TILE} px-2`;

// The neutral (unselected) colours most rail buttons share. No resting text
// colour: the icon/label inherit the default foreground, matching FilterRail.
export const RAIL_BTN_OFF = "hover:bg-sidebar-accent/50 hover:text-foreground";

// The selected/active tile background.
export const RAIL_BTN_ON =
  "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12";
