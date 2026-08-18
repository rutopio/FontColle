export interface FontAxis {
  tag: string;
  name: string | null;
  min: number | null;
  default: number | null;
  max: number | null;
}

export interface FontInstance {
  name: string | null;
  coords: Record<string, number>;
  italic: boolean;
}

export interface DesignerSibling {
  id: string;
  name: string;
}

export interface FontRecord {
  id: string;
  name: string;
  displayName: string | null;
  designer: string | null;
  category: string;
  apiCategory: string | null;
  license: string | null;
  isVariable: boolean;
  subsets: string[];
  repositoryUrl: string | null;
  isNoto: boolean | null;
  isBrandFont: boolean | null;
  isOpenSource: boolean | null;
  axes: FontAxis[];
  instances: FontInstance[];
  features: string[];
  facets: string[];
  colorTables: string[];
  languages: string[];
  scripts: string[];
  cjkCoverage?: Record<string, number>;
  version: number | null;
  versionString: string | null;
  dateAdded: string | null;
  firstCommitDate: string | null;
  createdMs: number | null;
  modifiedMs: number | null;
  weightClass: number | null;
  widthClass: number | null;
  weights: number[];
  glyphCount: number | null;
  charCount: number | null;
  primaryScript: string | null;
  popularityRank: number | null;
  trendingRank: number | null;
  /**
   * Google's own re-serving date. NOT shown or sortable in the UI: it takes
   * only 57 distinct values across 1942 families (Google re-publishes in
   * batches), so it groups unrelated fonts rather than ordering them. Kept
   * because daily_update.py diffs it to decide which families to re-harvest.
   */
  lastModifiedApi: string | null;
  /**
   * Upstream repo activity, from the family's own `repositoryUrl` (NOT
   * google/fonts). `upstreamHeadDate` is the default branch's head commit and
   * is what the Last updated filter and sort read; `upstreamAnyDate` (newest across all
   * branches) is stored but unused, since side branches like CI and dependabot
   * make a dormant repo look alive. Null for the 42 families with no github
   * repo. See scripts/harvester/backfill_upstream_activity.py.
   */
  upstreamHeadDate: string | null;
  upstreamAnyDate: string | null;
  upstreamPushedAt: string | null;
  upstreamArchived: boolean | null;
  upstreamRepoKey: string | null;
  upstreamNewestTag: string | null;
  /**
   * Newest commit touching a .ttf/.otf inside this family's google/fonts
   * directory — how new the file Google actually serves is. Orthogonal to
   * `upstreamHeadDate` (the author's own repo), and the two disagree in both
   * directions: Donegal One's upstream moved in 2026 while its packaged font
   * dates to 2015, and Comfortaa's author stopped in 2017 while Google
   * repackaged it in 2021. Deliberately scoped to the font FILES: the
   * directory's own head is usually Google metadata housekeeping (Alegreya's
   * is a foundry rename sitting on the repo-wide upstream_info.md campaign).
   * Null for the 8 apiOnly families, which have no directory there.
   * See scripts/harvester/backfill_gf_ttf_date.py.
   */
  gfTtfCommitDate: string | null;
  versionHistory?: { version: string; date: string }[];
  specimen: string | null;
  specimenTiers?: string[] | null;
  about?: string | null;
  designerProfiles?: {
    name: string | null;
    bio: string | null;
    imageUrl: string | null;
  }[];
  licenseHeader?: string | null;
  tags: Record<string, number>;
  unitsPerEm: number | null;
  xHeight: number | null;
  capHeight: number | null;
  italicAngle: number | null;
  hheaAscender: number | null;
  hheaDescender: number | null;
  hheaLineGap: number | null;
  typoAscender: number | null;
  typoDescender: number | null;
  typoLineGap: number | null;
  winAscent: number | null;
  winDescent: number | null;
  useTypoMetrics: boolean | null;
  avgCharWidth: number | null;
  contrast: number | null;
  isMonospace: boolean | null;
  hasHinting: boolean | null;
  vendorId: string | null;
  fileSize: number | null;
  /** Other families by each of this font's designers, keyed by designer name.
   *  Precomputed by scripts/gen-catalog.mjs into the per-font detail files
   *  only, so it is absent from the list/slim catalogs. */
  siblingsByDesigner?: Record<string, DesignerSibling[]>;
}
