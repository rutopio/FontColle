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
  // Google Fonts' full specimen title when it differs from `name` (e.g. name
  // "Playwrite BE VLG" -> "Playwrite België Vlaanderen"); null when identical.
  displayName: string | null;
  designer: string | null;
  class: string;
  category: string | null;
  license: string | null;
  isVariable: boolean;
  subsets: string[];
  // Upstream GitHub repo (METADATA.pb source) and provenance flags
  // (metadata/fonts). Null for older/edge/unpublished families.
  repositoryUrl: string | null;
  isNoto: boolean | null;
  isBrandFont: boolean | null;
  isOpenSource: boolean | null;
  axes: FontAxis[];
  instances: FontInstance[];
  features: string[];
  facets: string[];
  // sfnt tags of the color tables the font carries ("COLR", "CPAL", "SVG",
  // "sbix", "CBDT", "CBLC"). Empty for monochrome fonts. Several can coexist:
  // some families ship both COLR and OpenType-SVG for renderer fallback.
  colorTables: string[];
  // Writing-system / language coverage (todo: language-support task).
  languages: string[]; // supported lang ids, e.g. "en_Latn"
  scripts: string[]; // distinct scripts, e.g. "Latn", "Cyrl"
  cjkCoverage: Record<string, number>; // lang id -> exemplar coverage ratio
  // Archival metadata (may be null for older/edge fonts).
  version: number | null;
  versionString: string | null;
  dateAdded: string | null;
  firstCommitDate: string | null; // repo debut from git history, "yyyy-MM-dd"
  // head table created/modified stamps, epoch ms: when the font binary itself
  // was last compiled. Unlike lastModifiedApi (a Google publish event, which a
  // library-wide metadata pass bumps for every family at once), this only moves
  // when the outlines do. 0 for the handful of fonts that ship an unset stamp.
  createdMs: number | null;
  modifiedMs: number | null;
  weightClass: number | null;
  widthClass: number | null;
  weights: number[];
  glyphCount: number | null;
  charCount: number | null;
  primaryScript: string | null;
  // Signals from the Google Fonts Developer API (null when not published).
  popularityRank: number | null; // 1 = most popular
  trendingRank: number | null; // 1 = fastest-growing usage
  // Date Google Fonts reports for the version it currently serves,
  // "yyyy-MM-dd". Named for its source: the harvester writes this key
  // (to_dataset.apply_published_signals), never a bare `lastModified`.
  lastModifiedApi: string | null;
  // Release timeline from google/fonts git history, ascending by date.
  versionHistory: { version: string; date: string }[];
  specimen: string | null; // native-script sample text (null for Latin-only)
  // Google Fonts family "about" prose (HTML), from the metadata endpoint. Null
  // when Google has no description for the family.
  about: string | null;
  // Per-designer bios/avatars from the metadata endpoint. Empty when none.
  designerProfiles: {
    name: string | null;
    bio: string | null; // HTML
    imageUrl: string | null;
  }[];
  // OFL copyright header (per-family); null for Apache/UFL. The License tab
  // prepends it to the shared boilerplate for that license.
  licenseHeader: string | null;
  // Google Fonts classification tags (google/fonts tags CSV, e.g.
  // "/Serif/Fat Face"), not exposed by the Developer API. Scores are 0-100.
  // Empty for families the CSV doesn't cover.
  tags: Record<string, number>;
  // Style metrics from the primary TTF (2026-07 reharvest). Raw font units;
  // normalize against unitsPerEm at the UI layer. Null when unavailable.
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
  // Stroke-contrast ratio (thick/thin) at regular weight, from google/fonts
  // quant.csv. ~1.0 monolinear, 3+ high-contrast Didone. Null when unmeasured.
  contrast: number | null;
  isMonospace: boolean | null; // post isFixedPitch
  hasHinting: boolean | null; // TrueType instructions present
  vendorId: string | null; // OS/2 achVendID, e.g. "GOOG"
  fileSize: number | null; // primary TTF byte size
}
