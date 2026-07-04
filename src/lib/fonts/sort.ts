import type { FontRecord } from "./types";

export type SortKey =
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

export const DEFAULT_SORT: SortKey = "name-asc";

// Grouped options for the sort selector.
export const SORT_OPTIONS: { group: string; items: [SortKey, string][] }[] = [
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
