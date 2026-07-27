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

// `keys` are the FilterState arrays a group owns, summed into its rail badge so
// a selection scrolled out of view is still visible.
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

// Style leads as the most common entry point into browsing. Preset is NOT in
// this list: see PRESET_GROUP.
export const FILTER_GROUPS: FilterGroup[] = [
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["categories", "style"],
  },
  // Weight/Width and the wght/wdth axes are mutually exclusive, one clearing
  // the other, so they have to share a panel.
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
  // Feel, not form. Shares the `style` state with Style; countKey splits by
  // prefix so each rail badge counts only its own sections.
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

export const FILTER_GROUP_IDS: FilterGroupId[] = FILTER_GROUPS.map((g) => g.id);

// Kept out of FILTER_GROUPS because it isn't a facet of the catalog: it renders
// in the sidebar footer beside Favorite, the pair of device-local personal
// things. It still switches the panel like any group, so it keeps the shape.
// `keys: []` draws no badge, where a number would read as "3 filters active".
export const PRESET_GROUP: FilterGroup = {
  id: "preset",
  label: "Preset",
  icon: BookmarkSimpleIcon,
  keys: [],
};

export const DEFAULT_FILTER_GROUP: FilterGroupId = "style";

// `tags` has one entry point, the Font type radio. Every other key counts its
// own length.
function countKey(
  group: FilterGroup,
  key: keyof Omit<FilterState, "query">,
  filter: FilterState
) {
  if (key === "metrics") return Object.keys(filter.metrics).length;
  if (key === "hasHinting") return filter.hasHinting !== undefined ? 1 : 0;
  if (key === "instances") return filter.instances ? 1 : 0;
  // Modifiers, not conditions. No group lists this key; the guard only
  // satisfies the type union.
  if (key === "matchModes") return 0;
  // Style and Mood share the `style` state, so each counts only its own tags.
  if (key === "style") {
    const want = group.id === "mood" ? "mood" : "style";
    return filter.style.filter((t) => classificationGroupOf(t) === want).length;
  }
  return filter[key].length;
}

export function groupActiveCount(group: FilterGroup, filter: FilterState) {
  return group.keys.reduce((sum, key) => sum + countKey(group, key, filter), 0);
}
