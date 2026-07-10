import {
  DotsThreeOutlineIcon,
  type Icon,
  PaletteIcon,
  RulerIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  TagIcon,
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
  | "tag"
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
  // Natural-language trait tags: one flat list of plain-language pills (Italic,
  // Ligatures, Monospace, Colorful, Noto, Latin, Static/Variable, …). The Tag
  // panel owns the whole `facets` state; Font type is also shown as a radio in
  // the Axes panel, backed by the same state.
  {
    id: "tag",
    label: "Tag",
    icon: TagIcon,
    keys: ["facets"],
  },
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["classes", "classifications"],
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
    keys: ["license", "flags"],
  },
];

export const DEFAULT_FILTER_GROUP: FilterGroupId = "tag";

// `facets` is shared by two panels: the Tag panel shows the whole list (so its
// badge counts every selected facet), while Axes shows only static/variable as
// a Font type radio (so its badge counts just those). Split accordingly.
function countKey(
  group: FilterGroup,
  key: keyof Omit<FilterState, "query">,
  filter: FilterState
) {
  // Metric ranges: one count per active slider. Boolean facets: one when on.
  if (key === "metrics") return Object.keys(filter.metrics).length;
  if (key === "hasHinting") return filter.hasHinting !== undefined ? 1 : 0;
  if (key !== "facets") return filter[key].length;
  if (group.id === "axes") {
    const isFontType = (v: string) => FONT_TYPE_FACETS.includes(v);
    return filter.facets.filter(isFontType).length;
  }
  // Tag panel: every selected facet (font-type pills included).
  return filter.facets.length;
}

// How many values the group's own filter keys currently hold.
export function groupActiveCount(group: FilterGroup, filter: FilterState) {
  return group.keys.reduce((sum, key) => sum + countKey(group, key, filter), 0);
}
