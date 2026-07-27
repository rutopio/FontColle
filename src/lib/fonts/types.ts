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
  // The full specimen title when it differs: "Playwrite BE VLG" is really
  // "Playwrite België Vlaanderen". Null when identical.
  displayName: string | null;
  designer: string | null;
  // Derived from Google's classification scores. `apiCategory` is the coarser
  // raw value the webfonts API reports ("SANS_SERIF"), kept only as a fallback.
  category: string;
  apiCategory: string | null;
  license: string | null;
  isVariable: boolean;
  subsets: string[];
  // Null for older/edge/unpublished families.
  repositoryUrl: string | null;
  isNoto: boolean | null;
  isBrandFont: boolean | null;
  isOpenSource: boolean | null;
  axes: FontAxis[];
  instances: FontInstance[];
  features: string[];
  facets: string[];
  // sfnt tags ("COLR", "SVG", …), empty for monochrome. Several can coexist:
  // some families ship both COLR and OpenType-SVG for renderer fallback.
  colorTables: string[];
  languages: string[]; // supported lang ids, e.g. "en_Latn"
  scripts: string[]; // distinct scripts, e.g. "Latn", "Cyrl"
  // Every optional field below is DETAIL-ONLY (see DETAIL_ONLY_FIELDS in
  // scripts/gen-catalog.mjs): present on public/catalog/<id>.json records,
  // absent from the shared catalog the list fetches, so guard before use.
  cjkCoverage?: Record<string, number>; // lang id -> exemplar coverage ratio
  version: number | null;
  versionString: string | null;
  dateAdded: string | null;
  firstCommitDate: string | null; // repo debut from git history, "yyyy-MM-dd"
  // epoch ms. Unlike lastModifiedApi, these move only when the outlines do.
  // 0 for the handful of fonts that ship an unset stamp.
  createdMs: number | null;
  modifiedMs: number | null;
  weightClass: number | null;
  widthClass: number | null;
  weights: number[];
  glyphCount: number | null;
  charCount: number | null;
  primaryScript: string | null;
  popularityRank: number | null; // 1 = most popular
  trendingRank: number | null; // 1 = fastest-growing usage
  // The date Google reports for the version it currently serves. Named for its
  // source; the harvester never writes a bare `lastModified`.
  lastModifiedApi: string | null;
  versionHistory?: { version: string; date: string }[];
  specimen: string | null; // native-script sample text (null for Latin-only)
  // Three native-script passages from gflanguages, seeding the Tester's h1/h2/h3.
  // Null for Latin/emoji/blank fonts, which fall back to the Latin UDHR tiers.
  specimenTiers?: string[] | null;
  about?: string | null; // family "about" prose (HTML)
  designerProfiles?: {
    name: string | null;
    bio: string | null; // HTML
    imageUrl: string | null;
  }[];
  // Per-family OFL header, null for Apache/UFL. The License tab prepends it to
  // that license's shared boilerplate.
  licenseHeader?: string | null;
  // From the google/fonts tags CSV (e.g. "/Serif/Fat Face"), not the Developer
  // API. Scores are 0-100. Empty for families the CSV doesn't cover.
  tags: Record<string, number>;
  // Raw font units: normalize against unitsPerEm at the UI layer.
  unitsPerEm: number | null; // head unitsPerEm, the ratio denominator
  xHeight: number | null; // OS/2 sxXHeight
  capHeight: number | null; // OS/2 sCapHeight
  italicAngle: number | null; // post italicAngle, degrees
  hheaAscender: number | null;
  hheaDescender: number | null;
  hheaLineGap: number | null;
  typoAscender: number | null; // OS/2 sTypoAscender
  typoDescender: number | null; // OS/2 sTypoDescender
  typoLineGap: number | null; // OS/2 sTypoLineGap
  winAscent: number | null; // OS/2 usWinAscent
  winDescent: number | null; // OS/2 usWinDescent, positive per spec
  // OS/2 fsSelection bit 7: when true, the typo* trio (not hhea*/win*)
  // governs line height.
  useTypoMetrics: boolean | null;
  avgCharWidth: number | null; // OS/2 xAvgCharWidth
  // Stroke-contrast ratio (thick/thin) from google/fonts quant.csv, NOT
  // measured here. ~1.0 monolinear, 3+ high-contrast Didone.
  contrast: number | null;
  isMonospace: boolean | null; // post isFixedPitch
  hasHinting: boolean | null; // TrueType instructions present
  vendorId: string | null; // OS/2 achVendID, e.g. "GOOG"
  fileSize: number | null; // primary TTF byte size
}
