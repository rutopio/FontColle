import type { FontRecord } from "./types";

export type SortKey =
  | "popularity"
  | "trending"
  | "name-asc"
  | "name-desc"
  | "creator-asc"
  | "creator-desc"
  | "date-newest"
  | "date-oldest"
  | "glyphs-most"
  | "glyphs-fewest"
  | "axes-most"
  | "axes-fewest";

export const DEFAULT_SORT: SortKey = "popularity";

// Grouped options for the sort selector.
export const SORT_OPTIONS: { group: string; items: [SortKey, string][] }[] = [
  {
    group: "Popularity",
    items: [
      ["popularity", "Most popular"],
      ["trending", "Trending"],
    ],
  },
  {
    group: "Name",
    items: [
      ["name-asc", "A → Z"],
      ["name-desc", "Z → A"],
    ],
  },
  {
    group: "Creator",
    items: [
      ["creator-asc", "A → Z"],
      ["creator-desc", "Z → A"],
    ],
  },
  {
    group: "Date added",
    items: [
      ["date-newest", "Newest"],
      ["date-oldest", "Oldest"],
    ],
  },
  {
    group: "Glyphs",
    items: [
      ["glyphs-most", "Most"],
      ["glyphs-fewest", "Fewest"],
    ],
  },
  {
    group: "Axes",
    items: [
      ["axes-most", "Most"],
      ["axes-fewest", "Fewest"],
    ],
  },
];

export const SORT_LABELS: Record<SortKey, string> = Object.fromEntries(
  SORT_OPTIONS.flatMap((g) =>
    g.items.map(([key, label]) => [key, `${g.group}: ${label}`])
  )
) as Record<SortKey, string>;

// The sort control is split into a group picker (left) and a direction toggle
// (right). Each group maps its two directions to a concrete SortKey. `asc` is
// the "SortAscending" direction (A→Z, oldest, fewest); `desc` its reverse.
// `ascLabel`/`descLabel` name the directions for the toggle's tooltip/label.
// Groups with no `desc` (Popularity, Trending) are directionless: they have a
// single ranking and the direction toggle is disabled for them.
export type SortGroup = {
  group: string;
  asc: SortKey;
  desc?: SortKey;
  ascLabel: string;
  descLabel?: string;
};

export const SORT_GROUPS: SortGroup[] = [
  {
    // Popularity and Trending are each their own precomputed ranking with no
    // natural reverse, so they are separate directionless groups.
    group: "Popularity",
    asc: "popularity",
    ascLabel: "Most popular",
  },
  {
    group: "Trending",
    asc: "trending",
    ascLabel: "Trending",
  },
  {
    group: "Name",
    asc: "name-asc",
    desc: "name-desc",
    ascLabel: "A → Z",
    descLabel: "Z → A",
  },
  {
    group: "Creator",
    asc: "creator-asc",
    desc: "creator-desc",
    ascLabel: "A → Z",
    descLabel: "Z → A",
  },
  {
    group: "Date added",
    // Keep the ascending direction (SortAscending icon) consistent across
    // groups: A→Z, newest, and most all sit on `asc`; their reverses on `desc`.
    asc: "date-newest",
    desc: "date-oldest",
    ascLabel: "Newest",
    descLabel: "Oldest",
  },
  {
    group: "Glyphs",
    asc: "glyphs-most",
    desc: "glyphs-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Axes",
    asc: "axes-most",
    desc: "axes-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
];

// Resolve a SortKey to its group and whether it's the ascending direction.
export function sortGroupOf(key: SortKey): { group: SortGroup; asc: boolean } {
  for (const group of SORT_GROUPS) {
    if (group.asc === key) return { group, asc: true };
    if (group.desc === key) return { group, asc: false };
  }
  // Fallback to the default's group (popularity is always present).
  return { group: SORT_GROUPS[0], asc: true };
}

// A directionless group (Popularity, Trending) has no reverse; the direction
// toggle is disabled and does nothing for it.
export const isDirectionless = (group: SortGroup) => group.desc == null;

const byName = (a: FontRecord, b: FontRecord) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const byCreator = (a: FontRecord, b: FontRecord) =>
  (a.designer ?? "￿").localeCompare(b.designer ?? "￿", undefined, {
    sensitivity: "base",
  });

// Missing values sort last regardless of direction.
const numCmp = (av: number | null, bv: number | null, desc: boolean) => {
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return desc ? bv - av : av - bv;
};

const dateCmp = (a: FontRecord, b: FontRecord, newest: boolean) => {
  const av = a.dateAdded ?? "";
  const bv = b.dateAdded ?? "";
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return newest ? bv.localeCompare(av) : av.localeCompare(bv);
};

export function sortFonts(fonts: FontRecord[], key: SortKey): FontRecord[] {
  const out = [...fonts];
  switch (key) {
    case "popularity":
      // Lower rank = more popular; unranked (null) sort last, then by name.
      return out.sort(
        (a, b) =>
          numCmp(a.popularityRank, b.popularityRank, false) || byName(a, b)
      );
    case "trending":
      return out.sort(
        (a, b) => numCmp(a.trendingRank, b.trendingRank, false) || byName(a, b)
      );
    case "name-asc":
      return out.sort(byName);
    case "name-desc":
      return out.sort((a, b) => byName(b, a));
    case "creator-asc":
      return out.sort(byCreator);
    case "creator-desc":
      return out.sort((a, b) => byCreator(b, a));
    case "date-newest":
      return out.sort((a, b) => dateCmp(a, b, true) || byName(a, b));
    case "date-oldest":
      return out.sort((a, b) => dateCmp(a, b, false) || byName(a, b));
    case "glyphs-most":
      return out.sort(
        (a, b) => numCmp(a.glyphCount, b.glyphCount, true) || byName(a, b)
      );
    case "glyphs-fewest":
      return out.sort(
        (a, b) => numCmp(a.glyphCount, b.glyphCount, false) || byName(a, b)
      );
    case "axes-most":
      return out.sort(
        (a, b) => numCmp(a.axes.length, b.axes.length, true) || byName(a, b)
      );
    case "axes-fewest":
      return out.sort(
        (a, b) => numCmp(a.axes.length, b.axes.length, false) || byName(a, b)
      );
    default:
      return out.sort(byName);
  }
}
