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

export const FILTER_GROUPS: FilterGroup[] = [
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["categories", "spacing", "style"],
  },
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
    keys: ["source", "designers", "vendors"],
  },
  {
    id: "metrics",
    label: "Metric",
    icon: RulerIcon,
    keys: ["metrics", "upm", "hasHinting"],
  },
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

export const PRESET_GROUP: FilterGroup = {
  id: "preset",
  label: "Preset",
  icon: BookmarkSimpleIcon,
  keys: [],
};

export const DEFAULT_FILTER_GROUP: FilterGroupId = "style";

function countKey(
  group: FilterGroup,
  key: keyof Omit<FilterState, "query">,
  filter: FilterState
) {
  if (key === "metrics") return Object.keys(filter.metrics).length;
  if (key === "hasHinting") return filter.hasHinting !== undefined ? 1 : 0;
  if (key === "instances") return filter.instances ? 1 : 0;
  if (key === "matchModes") return 0;
  if (key === "style") {
    const want = group.id === "mood" ? "mood" : "style";
    return filter.style.filter((t) => classificationGroupOf(t) === want).length;
  }
  return filter[key].length;
}

export function groupActiveCount(group: FilterGroup, filter: FilterState) {
  return group.keys.reduce((sum, key) => sum + countKey(group, key, filter), 0);
}
