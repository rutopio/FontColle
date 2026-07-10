import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// One row per published family. Archival metadata is stored as flat columns
// (no JSON blob — D1/SQLite can't index or scan blobs efficiently). content_hash
// lets the harvester skip unchanged families on incremental runs (todo §5/§7).
export const family = sqliteTable(
  "family",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    familyDir: text("family_dir").notNull().unique(), // repo dir, stable key
    name: text("name").notNull(),
    displayName: text("display_name"), // GF full title when != name; else null
    designer: text("designer"),
    category: text("category"), // Google's coarse style
    primaryClass: text("primary_class").notNull(), // our re-derived class (§12)
    license: text("license"), // OFL / APACHE / UFL
    licenseDir: text("license_dir"), // ofl / apache / ufl (repo path)
    isVariable: integer("is_variable", { mode: "boolean" }).notNull(),
    subsets: text("subsets"), // JSON array of subset names
    primaryTtf: text("primary_ttf"),

    // --- version tracking (from head + name table) ---
    version: real("version"), // head.fontRevision, e.g. 2.1
    versionString: text("version_string"), // name ID 5, "Version 2.100"
    createdMs: integer("created_ms"), // font head.created (epoch ms)
    modifiedMs: integer("modified_ms"), // font head.modified (epoch ms)
    dateAdded: text("date_added"), // METADATA date_added, "2011-05-11"

    // --- classification / metrics (from OS/2 + head + maxp + cmap) ---
    weightClass: integer("weight_class"), // OS/2 usWeightClass
    widthClass: integer("width_class"), // OS/2 usWidthClass
    // JSON int array of the standard weight steps this family offers (static:
    // per-file weights snapped to 100; variable: steps inside the wght axis).
    weights: text("weights"),
    fsType: integer("fs_type"), // OS/2 embedding permission bits
    glyphCount: integer("glyph_count"), // maxp numGlyphs
    charCount: integer("char_count"), // cmap character count
    unitsPerEm: integer("units_per_em"), // head unitsPerEm
    hasStat: integer("has_stat", { mode: "boolean" }), // STAT table present
    // Color tables present in the primary TTF, as a JSON array of sfnt tags
    // ("COLR","CPAL","SVG ",...). Empty for monochrome fonts. A font can carry
    // several at once, so this is a list rather than a single format enum.
    colorTables: text("color_tables"),
    primaryScript: text("primary_script"), // METADATA primary_script, "Latn"
    // PANOSE 10 digits as a compact string "2,11,2,0,..." (rarely populated,
    // kept flat for the few families that set it).
    panose: text("panose"),
    // CJK exemplar coverage ratios {"zh_Hant":1.0,...} as JSON, for progressive
    // display. Supported languages/scripts live in reverse-index tables below.
    cjkCoverage: text("cjk_coverage"),

    // False for families in the google/fonts repo but not served by Google Fonts
    // (renamed, retired, or not yet published). Set during seed from the API whitelist.
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(true),
    // Signals from the Google Fonts Developer API (absent in the GitHub repo).
    // 1-based ranks; null when the family isn't in the published list.
    popularityRank: integer("popularity_rank"),
    trendingRank: integer("trending_rank"),
    lastModified: text("last_modified"), // API "yyyy-MM-dd", more current than date_added
    // Sample text in the font's own script (gflanguages), like Google Fonts'
    // non-Latin previews. Null for Latin-only fonts (frontend uses its default).
    specimen: text("specimen"),
    // Google Fonts classification tags (google/fonts tags CSV, not exposed by
    // the Developer API) as JSON {"<full tag path>": score}, e.g.
    // {"/Serif/Fat Face": 90}. Scores are 0-100. Empty object when uncovered.
    tags: text("tags"),

    // --- style metrics from the primary TTF (2026-07 reharvest) ---
    // Raw font units (see unitsPerEm above); ratios derived at the UI layer.
    // All nullable: absent when the source table isn't present in the font.
    xHeight: integer("x_height"), // OS/2 sxXHeight
    capHeight: integer("cap_height"), // OS/2 sCapHeight
    italicAngle: real("italic_angle"), // post italicAngle, degrees
    hheaAscender: integer("hhea_ascender"), // hhea ascender
    hheaDescender: integer("hhea_descender"), // hhea descender
    hheaLineGap: integer("hhea_line_gap"), // hhea lineGap
    typoAscender: integer("typo_ascender"), // OS/2 sTypoAscender
    typoDescender: integer("typo_descender"), // OS/2 sTypoDescender
    typoLineGap: integer("typo_line_gap"), // OS/2 sTypoLineGap
    winAscent: integer("win_ascent"), // OS/2 usWinAscent
    winDescent: integer("win_descent"), // OS/2 usWinDescent, positive per spec
    // OS/2 fsSelection bit 7: when set, the typo* trio (not hhea*/win*)
    // governs line height.
    useTypoMetrics: integer("use_typo_metrics", { mode: "boolean" }),
    avgCharWidth: integer("avg_char_width"), // OS/2 xAvgCharWidth
    isMonospace: integer("is_monospace", { mode: "boolean" }), // post isFixedPitch
    hasHinting: integer("has_hinting", { mode: "boolean" }), // TrueType instructions present
    vendorId: text("vendor_id"), // OS/2 achVendID, e.g. "GOOG"
    fileSize: integer("file_size"), // primary TTF byte size

    contentHash: text("content_hash").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("family_class_idx").on(t.primaryClass),
    index("family_variable_idx").on(t.isVariable),
    index("family_popularity_idx").on(t.popularityRank),
  ]
);

// Reverse index: feature tag -> family (todo §5). GIN-equivalent for SQLite is a
// plain index on the tag; the intersection query joins per selected tag.
export const familyFeature = sqliteTable(
  "family_feature",
  {
    familyId: integer("family_id")
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    featureTag: text("feature_tag").notNull(),
    tableKind: text("table_kind").notNull(), // "GSUB" | "GPOS"
  },
  (t) => [
    index("family_feature_tag_idx").on(t.featureTag),
    index("family_feature_family_idx").on(t.familyId),
  ]
);

// Reverse index: axis tag -> family, with range for future range filters.
export const familyAxis = sqliteTable(
  "family_axis",
  {
    familyId: integer("family_id")
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    axisTag: text("axis_tag").notNull(),
    axisName: text("axis_name"),
    minValue: real("min_value"),
    defaultValue: real("default_value"),
    maxValue: real("max_value"),
  },
  (t) => [
    index("family_axis_tag_idx").on(t.axisTag),
    index("family_axis_family_idx").on(t.familyId),
  ]
);

// Named instances for weight/style preview (pain point 4).
export const familyInstance = sqliteTable(
  "family_instance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    familyId: integer("family_id")
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    coords: text("coords").notNull(), // JSON {"wght":300,...}
    italic: integer("italic", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("family_instance_family_idx").on(t.familyId)]
);

// Reverse index: language id -> family (todo: language-support task). Mirrors
// family_feature so "families supporting language X" is a plain indexed join.
export const familyLanguage = sqliteTable(
  "family_language",
  {
    familyId: integer("family_id")
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    langId: text("lang_id").notNull(), // gflanguages id, "en_Latn"
  },
  (t) => [
    index("family_language_lang_idx").on(t.langId),
    index("family_language_family_idx").on(t.familyId),
  ]
);

// Reverse index: script code -> family. Primary "writing system" filter.
export const familyScript = sqliteTable(
  "family_script",
  {
    familyId: integer("family_id")
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    script: text("script").notNull(), // ISO 15924, "Latn", "Cyrl"
  },
  (t) => [
    index("family_script_script_idx").on(t.script),
    index("family_script_family_idx").on(t.familyId),
  ]
);
