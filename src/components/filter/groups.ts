import {
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
  | "other";

export interface FilterGroup {
  id: FilterGroupId;
  label: string;
  icon: Icon;
  keys: (keyof Omit<FilterState, "query">)[];
}

// Rail order, top to bottom: Style, Variant, Language, Color, Feature,
// Designer, Metric, Mood, More. Style leads because form (Serif / Sans /
// Script) is the most common entry point into browsing; the broad,
// browse-everything panel (Mood) sits near the bottom.
export const FILTER_GROUPS: FilterGroup[] = [
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["classes", "style"],
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

// The rail opens on Style, which is also the first button in the rail.
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
