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

export interface FontRecord {
  id: string;
  name: string;
  designer: string | null;
  class: string;
  category: string | null;
  license: string | null;
  isVariable: boolean;
  subsets: string[];
  axes: FontAxis[];
  instances: FontInstance[];
  features: string[];
  facets: string[];
  // Writing-system / language coverage (todo: language-support task).
  languages: string[]; // supported lang ids, e.g. "en_Latn"
  scripts: string[]; // distinct scripts, e.g. "Latn", "Cyrl"
  cjkCoverage: Record<string, number>; // lang id -> exemplar coverage ratio
  // Archival metadata (may be null for older/edge fonts).
  version: number | null;
  versionString: string | null;
  dateAdded: string | null;
  weightClass: number | null;
  widthClass: number | null;
  weights: number[];
  glyphCount: number | null;
  charCount: number | null;
  primaryScript: string | null;
  // Signals from the Google Fonts Developer API (null when not published).
  popularityRank: number | null; // 1 = most popular
  trendingRank: number | null; // 1 = fastest-growing usage
  lastModified: string | null; // API "yyyy-MM-dd"
}
