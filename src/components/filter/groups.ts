import {
  BookmarkSimpleIcon,
  CodeIcon,
  DotsThreeOutlineIcon,
  type Icon,
  IntersectThreeIcon,
  PaletteIcon,
  RulerIcon,
  ShapesIcon,
  SmileyMeltingIcon,
  TranslateIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { classificationGroupOf, type FilterState } from "@/lib/fonts/filter";

// The filter panel used to stack every section in one long scroll. It's now
// split into groups, one per icon-rail button: the rail switches which group
// the panel shows. `keys` are the FilterState arrays a group owns, summed into
// the rail badge so a selection made in a hidden group is still visible.
export type FilterGroupId =
  | "style"
  | "mood"
  | "language"
  | "color"
  | "axes"
  | "features"
  | "metrics"
  | "designer"
  | "other"
  | "preset";

export interface FilterGroup {
  id: FilterGroupId;
  label: string;
  icon: Icon;
  keys: (keyof Omit<FilterState, "query">)[];
}

// Rail order, top to bottom: Style, Variant, Language, Color, Feature,
// Designer, Metric, Mood, More — then Preset, which is NOT part of this
// scrolling list. Style leads because form (Serif / Sans / Script) is the most
// common entry point into browsing; the broad, browse-everything panel (Mood)
// sits near the bottom. Preset renders in the sidebar footer instead (see
// PRESET_GROUP and app-sidebar's footer), grouped with Favorite as the two
// device-local personal things, above the separator.
export const FILTER_GROUPS: FilterGroup[] = [
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["categories", "style"],
  },
  // Weight/Width and the wght/wdth variable axes are mutually exclusive, one
  // clears the other, so they have to share a panel. Also owns Font type (the
  // static/variable tags), Italic (the has-italic radio) and Instances (how
  // many named styles the family ships).
  {
    id: "axes",
    label: "Variant",
    icon: IntersectThreeIcon,
    keys: ["weights", "widths", "axes", "tags", "italic", "instances"],
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
  {
    id: "features",
    label: "Feature",
    icon: CodeIcon,
    keys: ["features"],
  },
  // Browse by who made the font: Source (Noto / Non-Noto), designer names, and
  // the OS/2 vendor id.
  {
    id: "designer",
    label: "Designer",
    icon: UserIcon,
    keys: ["flags", "designers", "vendors"],
  },
  {
    id: "metrics",
    label: "Metric",
    icon: RulerIcon,
    keys: ["metrics", "upm", "hasHinting"],
  },
  // Feel, not form: the Expressive / Theme / Seasonal classification sections.
  // Shares the `style` state with Style; countKey splits by prefix so
  // each rail badge counts only its own sections.
  {
    id: "mood",
    label: "Mood",
    icon: SmileyMeltingIcon,
    keys: ["style"],
  },
  {
    id: "other",
    label: "More",
    icon: DotsThreeOutlineIcon,
    keys: ["license", "repoHosts", "activity"],
  },
];

// Rail order as plain ids, for the panel's scroll-spy: it walks the sections in
// render order to find which one the scroll has reached.
export const FILTER_GROUP_IDS: FilterGroupId[] = FILTER_GROUPS.map((g) => g.id);

// Saved filter combinations. Kept out of FILTER_GROUPS because it isn't a facet
// of the catalog: it renders in the sidebar footer beside Favorite, the pair of
// device-local personal things, rather than in the scrolling rail of filters.
// It still switches the panel like any group, so it carries the same shape.
// `keys: []` means groupActiveCount returns 0 and no badge is drawn — a number
// there would read as "3 filters active in Preset".
export const PRESET_GROUP: FilterGroup = {
  id: "preset",
  label: "Preset",
  icon: BookmarkSimpleIcon,
  keys: [],
};

// The rail opens on Style: the browsing entry point. Preset would be a dead
// first impression with an empty list, and it no longer sits in the rail anyway.
export const DEFAULT_FILTER_GROUP: FilterGroupId = "style";

// `tags` now has a single entry point: the Variant panel's Font type radio
// (static/variable). Every other key counts its own length.
function countKey(
  group: FilterGroup,
  key: keyof Omit<FilterState, "query">,
  filter: FilterState
) {
  // Metric ranges: one count per active slider. Boolean facets: one when on.
  if (key === "metrics") return Object.keys(filter.metrics).length;
  if (key === "hasHinting") return filter.hasHinting !== undefined ? 1 : 0;
  // Instance range: one condition when set (a range, not a value list).
  if (key === "instances") return filter.instances ? 1 : 0;
  // Section OR/AND modes are modifiers, not conditions, never counted. (No
  // group lists this key anyway; the guard is here to satisfy the type union.)
  if (key === "matchModes") return 0;
  // Style and Mood share the `style` state; each counts only the tags
  // whose section belongs to it (Style = form, Mood = feel).
  if (key === "style") {
    const want = group.id === "mood" ? "mood" : "style";
    return filter.style.filter((t) => classificationGroupOf(t) === want).length;
  }
  return filter[key].length;
}

// How many values the group's own filter keys currently hold.
export function groupActiveCount(group: FilterGroup, filter: FilterState) {
  return group.keys.reduce((sum, key) => sum + countKey(group, key, filter), 0);
}
