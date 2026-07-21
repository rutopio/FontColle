import {
  CodeIcon,
  DotsThreeOutlineIcon,
  type Icon,
  IntersectThreeIcon,
  PaletteIcon,
  RulerIcon,
  ShapesIcon,
  SmileyMeltingIcon,
  TagIcon,
  TranslateIcon,
  UserIcon,
} from "@phosphor-icons/react";
import {
  classificationGroupOf,
  type FilterState,
  FONT_TYPE_FACETS,
} from "@/lib/fonts/filter";

// The filter panel used to stack every section in one long scroll. It's now
// split into groups, one per icon-rail button: the rail switches which group
// the panel shows. `keys` are the FilterState arrays a group owns, summed into
// the rail badge so a selection made in a hidden group is still visible.
export type FilterGroupId =
  | "style"
  | "tag"
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

// Rail order, top to bottom: Tag, Mood, Style, Variant, Language, Color,
// Feature, Designer, Metric, More.
export const FILTER_GROUPS: FilterGroup[] = [
  // Natural-language trait tags: one flat list of plain-language pills
  // (Ligatures, Monospace, Colorful, Noto, Latin, Static/Variable, …). The Tag
  // panel owns the whole `facets` state; Font type is also shown as a radio in
  // the Variant panel (group id "axes"), backed by the same state.
  {
    id: "tag",
    label: "Tag",
    icon: TagIcon,
    keys: ["facets"],
  },
  // Feel, not form: the Expressive / Theme / Seasonal classification sections.
  // Shares the `classifications` state with Style; countKey splits by prefix so
  // each rail badge counts only its own sections.
  {
    id: "mood",
    label: "Mood",
    icon: SmileyMeltingIcon,
    keys: ["classifications"],
  },
  {
    id: "style",
    label: "Style",
    icon: ShapesIcon,
    keys: ["classes", "classifications"],
  },
  // Weight/Width and the wght/wdth variable axes are mutually exclusive, one
  // clears the other, so they have to share a panel. Also owns Font type (the
  // static/variable facets), Italic (the has-italic radio) and Instances (how
  // many named styles the family ships).
  {
    id: "axes",
    label: "Variant",
    icon: IntersectThreeIcon,
    keys: ["weights", "widths", "axes", "facets", "italic", "instances"],
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
  {
    id: "other",
    label: "More",
    icon: DotsThreeOutlineIcon,
    keys: ["license", "repoHosts", "activity"],
  },
];

// The rail opens on Style even though it sits third in the rail order, form
// (Serif / Sans / Script) is the most common entry point into browsing.
export const DEFAULT_FILTER_GROUP: FilterGroupId = "style";

// `facets` is shared by two panels: the Tag panel shows the whole list (so its
// badge counts every selected facet), while the Variant panel (group id "axes")
// shows only static/variable as a Font type radio (so its badge counts just
// those). Split accordingly.
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
  // Style and Mood share the `classifications` state; each counts only the tags
  // whose section belongs to it (Style = form, Mood = feel).
  if (key === "classifications") {
    const want = group.id === "mood" ? "mood" : "style";
    return filter.classifications.filter(
      (t) => classificationGroupOf(t) === want
    ).length;
  }
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
