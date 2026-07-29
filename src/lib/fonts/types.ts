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
  // Fields below are detail-only: present in per-font JSON, absent from catalog.
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
  lastModifiedApi: string | null;
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
}
