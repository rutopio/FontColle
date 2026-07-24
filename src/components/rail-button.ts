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

const RAIL_BTN_BASE =
  "group/rail-btn cursor-pointer rounded-md outline-none transition-[color,background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-snap)] focus-visible:ring-2 focus-visible:ring-sidebar-ring active:scale-[0.96]";

// Desktop tile: icon stacked over a caption.
export const RAIL_BTN = `${RAIL_BTN_BASE} relative flex flex-col items-center gap-1 py-2`;

// Compact mobile top-bar icon button: no tile, no caption.
export const RAIL_BAR_BTN = `${RAIL_BTN_BASE} flex size-11 items-center justify-center`;

// The neutral (unselected) colours most rail buttons share. No resting text
// colour: the icon/label inherit the default foreground, matching FilterRail.
export const RAIL_BTN_OFF = "hover:bg-sidebar-accent/50 hover:text-foreground";

// The selected/active tile background.
export const RAIL_BTN_ON =
  "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12";
