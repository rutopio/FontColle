const RAIL_BTN_CHROME =
  "cursor-pointer rounded-md outline-none transition-[color,background-color,transform] duration-fast ease-snap focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]";

const RAIL_BTN_BASE = `group/rail-btn ${RAIL_BTN_CHROME}`;

const RAIL_TILE = "relative flex flex-col items-center gap-1 py-2";

export const RAIL_BTN_OFF = "hover:bg-accent/50 hover:text-foreground";

export const RAIL_BTN = `${RAIL_BTN_BASE} ${RAIL_TILE}`;

export const RAIL_BAR_BTN = `${RAIL_BTN_BASE} flex size-11 items-center justify-center`;

export const RAIL_HEADER_BTN = `${RAIL_BTN_CHROME} flex size-9 shrink-0 items-center justify-center`;

export const RAIL_HEADER_CELL = "group/rail-btn flex shrink-0 items-center";

// Full-strength selected surface (unselected tiles hover to accent/50).
const RAIL_ON_SURFACE = "bg-accent";

export const RAIL_BTN_ON = `${RAIL_ON_SURFACE} text-accent-foreground`;

// Sliding variant: surface travels via shared RailIndicator layoutId.
export const RAIL_BTN_ON_SLIDING = "text-accent-foreground";

export const RAIL_INDICATOR = `${RAIL_ON_SURFACE} absolute inset-0 -z-1 rounded-md`;
