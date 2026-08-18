import type { FontRecord } from "./types";

export type SortKey =
  | "popularity"
  | "popularity-least"
  | "trending"
  | "trending-least"
  | "name-asc"
  | "name-desc"
  | "creator-asc"
  | "creator-desc"
  | "date-newest"
  | "date-oldest"
  | "updated-newest"
  | "updated-oldest"
  | "gfupdated-newest"
  | "gfupdated-oldest"
  | "glyphs-most"
  | "glyphs-fewest"
  | "axes-most"
  | "axes-fewest"
  | "features-most"
  | "features-fewest"
  | "instances-most"
  | "instances-fewest";

export const DEFAULT_SORT: SortKey = "popularity";

export type SortGroup = {
  group: string;
  asc: SortKey;
  desc?: SortKey;
  ascLabel: string;
  descLabel?: string;
};

export const SORT_GROUPS: SortGroup[] = [
  {
    group: "Popularity",
    asc: "popularity",
    desc: "popularity-least",
    ascLabel: "Most popular",
    descLabel: "Least popular",
  },
  {
    group: "Trending",
    asc: "trending",
    desc: "trending-least",
    ascLabel: "Trending",
    descLabel: "Least trending",
  },
  {
    group: "Name",
    asc: "name-asc",
    desc: "name-desc",
    ascLabel: "A → Z",
    descLabel: "Z → A",
  },
  {
    group: "Designer Name",
    asc: "creator-asc",
    desc: "creator-desc",
    ascLabel: "A → Z",
    descLabel: "Z → A",
  },
  {
    group: "Instance count",
    asc: "instances-most",
    desc: "instances-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Glyph count",
    asc: "glyphs-most",
    desc: "glyphs-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Axis count",
    asc: "axes-most",
    desc: "axes-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Feature count",
    asc: "features-most",
    desc: "features-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "GF Added",
    asc: "date-newest",
    desc: "date-oldest",
    ascLabel: "Newest additions",
    descLabel: "Oldest additions",
  },
  {
    group: "GF Updated",
    asc: "gfupdated-newest",
    desc: "gfupdated-oldest",
    ascLabel: "Most recently updated",
    descLabel: "Least recently updated",
  },
  {
    group: "Upstream Updated",
    asc: "updated-newest",
    desc: "updated-oldest",
    ascLabel: "Most recently updated",
    descLabel: "Least recently updated",
  },
];

export function sortGroupOf(key: SortKey): { group: SortGroup; asc: boolean } {
  for (const group of SORT_GROUPS) {
    if (group.asc === key) return { group, asc: true };
    if (group.desc === key) return { group, asc: false };
  }
  return { group: SORT_GROUPS[0], asc: true };
}

export const isDirectionless = (group: SortGroup) => group.desc == null;

const byName = (a: FontRecord, b: FontRecord) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const byCreator = (a: FontRecord, b: FontRecord) =>
  (a.designer ?? "￿").localeCompare(b.designer ?? "￿", undefined, {
    sensitivity: "base",
  });

const numCmp = (av: number | null, bv: number | null, desc: boolean) => {
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return desc ? bv - av : av - bv;
};

/** ISO `YYYY-MM-DD` strings, so lexical order is chronological order. */
const isoCmp = (av: string | null, bv: string | null, newest: boolean) => {
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return newest ? bv.localeCompare(av) : av.localeCompare(bv);
};

/** When GF added the family, not when the font was made. */
const dateCmp = (a: FontRecord, b: FontRecord, newest: boolean) =>
  isoCmp(a.dateAdded, b.dateAdded, newest);

/** Upstream repo head date (not lastModifiedApi, which is Google's batch date). */
const updatedCmp = (a: FontRecord, b: FontRecord, newest: boolean) =>
  isoCmp(a.upstreamHeadDate, b.upstreamHeadDate, newest);

/** Newest commit in google/fonts for this family's TTFs. */
const gfUpdatedCmp = (a: FontRecord, b: FontRecord, newest: boolean) =>
  isoCmp(a.gfTtfCommitDate, b.gfTtfCommitDate, newest);

export function sortFonts(fonts: FontRecord[], key: SortKey): FontRecord[] {
  const out = [...fonts];
  switch (key) {
    case "popularity":
      return out.sort(
        (a, b) =>
          numCmp(a.popularityRank, b.popularityRank, false) || byName(a, b)
      );
    case "popularity-least":
      return out.sort(
        (a, b) =>
          numCmp(a.popularityRank, b.popularityRank, true) || byName(a, b)
      );
    case "trending":
      return out.sort(
        (a, b) => numCmp(a.trendingRank, b.trendingRank, false) || byName(a, b)
      );
    case "trending-least":
      return out.sort(
        (a, b) => numCmp(a.trendingRank, b.trendingRank, true) || byName(a, b)
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
    case "updated-newest":
      return out.sort((a, b) => updatedCmp(a, b, true) || byName(a, b));
    case "updated-oldest":
      return out.sort((a, b) => updatedCmp(a, b, false) || byName(a, b));
    case "gfupdated-newest":
      return out.sort((a, b) => gfUpdatedCmp(a, b, true) || byName(a, b));
    case "gfupdated-oldest":
      return out.sort((a, b) => gfUpdatedCmp(a, b, false) || byName(a, b));
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
    case "features-most":
      return out.sort(
        (a, b) =>
          numCmp(a.features.length, b.features.length, true) || byName(a, b)
      );
    case "features-fewest":
      return out.sort(
        (a, b) =>
          numCmp(a.features.length, b.features.length, false) || byName(a, b)
      );
    case "instances-most":
      return out.sort(
        (a, b) =>
          numCmp(a.instances.length, b.instances.length, true) || byName(a, b)
      );
    case "instances-fewest":
      return out.sort(
        (a, b) =>
          numCmp(a.instances.length, b.instances.length, false) || byName(a, b)
      );
    default:
      return out.sort(byName);
  }
}
