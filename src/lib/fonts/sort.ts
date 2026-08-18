import { vendorLabel } from "./labels";
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
  | "foundry-asc"
  | "foundry-desc"
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
  | "instances-fewest"
  | "languages-most"
  | "languages-fewest"
  | "scripts-most"
  | "scripts-fewest"
  | "filesize-largest"
  | "filesize-smallest";

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
    group: "Foundry Name",
    asc: "foundry-asc",
    desc: "foundry-desc",
    ascLabel: "A → Z",
    descLabel: "Z → A",
  },
  {
    group: "Instance Count",
    asc: "instances-most",
    desc: "instances-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Glyph Count",
    asc: "glyphs-most",
    desc: "glyphs-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Axis Count",
    asc: "axes-most",
    desc: "axes-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Feature Count",
    asc: "features-most",
    desc: "features-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Language Count",
    asc: "languages-most",
    desc: "languages-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Writing System Count",
    asc: "scripts-most",
    desc: "scripts-fewest",
    ascLabel: "Most",
    descLabel: "Fewest",
  },
  {
    group: "Google Fonts Added",
    asc: "date-newest",
    desc: "date-oldest",
    ascLabel: "Newest additions",
    descLabel: "Oldest additions",
  },
  {
    group: "Google Fonts Updated",
    asc: "gfupdated-newest",
    desc: "gfupdated-oldest",
    ascLabel: "Most recently updated",
    descLabel: "Least recently updated",
  },
  {
    group: "Upstream Repo Updated",
    asc: "updated-newest",
    desc: "updated-oldest",
    ascLabel: "Most recently updated",
    descLabel: "Least recently updated",
  },
  {
    group: "File Size",
    asc: "filesize-largest",
    desc: "filesize-smallest",
    ascLabel: "Largest",
    descLabel: "Smallest",
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

/** Resolved foundry name from the OS/2 vendor ID; unregistered codes sort as the raw ID. */
const byFoundry = (a: FontRecord, b: FontRecord) =>
  (a.vendorId ? vendorLabel(a.vendorId) : "￿").localeCompare(
    b.vendorId ? vendorLabel(b.vendorId) : "￿",
    undefined,
    { sensitivity: "base" }
  );

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
    case "foundry-asc":
      return out.sort((a, b) => byFoundry(a, b) || byName(a, b));
    case "foundry-desc":
      return out.sort((a, b) => byFoundry(b, a) || byName(a, b));
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
    case "languages-most":
      return out.sort(
        (a, b) =>
          numCmp(a.languages.length, b.languages.length, true) || byName(a, b)
      );
    case "languages-fewest":
      return out.sort(
        (a, b) =>
          numCmp(a.languages.length, b.languages.length, false) || byName(a, b)
      );
    case "scripts-most":
      return out.sort(
        (a, b) =>
          numCmp(a.scripts.length, b.scripts.length, true) || byName(a, b)
      );
    case "scripts-fewest":
      return out.sort(
        (a, b) =>
          numCmp(a.scripts.length, b.scripts.length, false) || byName(a, b)
      );
    case "filesize-largest":
      return out.sort(
        (a, b) => numCmp(a.fileSize, b.fileSize, true) || byName(a, b)
      );
    case "filesize-smallest":
      return out.sort(
        (a, b) => numCmp(a.fileSize, b.fileSize, false) || byName(a, b)
      );
    default:
      return out.sort(byName);
  }
}
