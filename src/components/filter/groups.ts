import {
  DotsThreeOutlineIcon,
  type Icon,
  PaletteIcon,
  RulerIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  ToggleRightIcon,
  TranslateIcon,
} from "@phosphor-icons/react";
import { type FilterState, FONT_TYPE_FACETS } from "@/lib/fonts/filter";

// The filter panel used to stack every section in one long scroll. It's now
// split into groups, one per icon-rail button: the rail switches which group
// the panel shows. `keys` are the FilterState arrays a group owns, summed into
// the rail badge so a selection made in a hidden group is still visible.
export type FilterGroupId =
  | "style"
  | "language"
  | "color"
  | "axes"
  | "features"
  | "metrics"
  | "other";

export interface FilterGroup {
  id: FilterGroupId;
  label: string;
  icon: Icon;
  keys: (keyof Omit<FilterState, "query">)[];
}

export const FILTER_GROUPS: FilterGroup[] = [
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["classes", "facets", "classifications"],
  },
  {
    id: "language",
    label: "Language",
    icon: TranslateIcon,
    keys: ["scripts", "languages"],
  },
  {
    id: "color",
    label: "Color",
    icon: PaletteIcon,
    keys: ["color", "colorFormats"],
  },
  // Weight/Width and the wght/wdth variable axes are mutually exclusive — one
  // clears the other — so they have to share a panel, or the clearing happens
  // out of sight. Also owns Font type (the static/variable facets).
  {
    id: "axes",
    label: "Axes",
    icon: SlidersHorizontalIcon,
    keys: ["weights", "widths", "axes", "facets"],
  },
  {
    id: "features",
    label: "Features",
    icon: ToggleRightIcon,
    keys: ["features"],
  },
  {
    id: "metrics",
    label: "Metrics",
    icon: RulerIcon,
    keys: ["metrics", "upm", "hasHinting"],
  },
  {
    id: "other",
    label: "Others",
    icon: DotsThreeOutlineIcon,
    keys: ["license"],
  },
];

export const DEFAULT_FILTER_GROUP: FilterGroupId = "style";

// `facets` is the one key two groups share: Axes owns its static/variable
// values (shown as Font type), Style owns all the rest (shown as Properties).
// Split the count accordingly so each badge reflects only its own panel.
function countKey(
  group: FilterGroup,
  key: keyof Omit<FilterState, "query">,
  filter: FilterState
) {
  // Metric ranges: one count per active slider. Boolean facets: one when on.
  if (key === "metrics") return Object.keys(filter.metrics).length;
  if (key === "hasHinting") return filter.hasHinting !== undefined ? 1 : 0;
  if (key !== "facets") return filter[key].length;
  const isFontType = (v: string) => FONT_TYPE_FACETS.includes(v);
  return filter.facets.filter(
    group.id === "axes" ? isFontType : (v) => !isFontType(v)
  ).length;
}

// How many values the group's own filter keys currently hold.
export function groupActiveCount(group: FilterGroup, filter: FilterState) {
  return group.keys.reduce((sum, key) => sum + countKey(group, key, filter), 0);
}
