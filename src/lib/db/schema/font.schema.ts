import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// One row per published family. content_hash lets the harvester skip unchanged
// families on incremental runs (todo §5/§7).
export const family = sqliteTable("family", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyDir: text("family_dir").notNull().unique(), // repo dir, stable key
  name: text("name").notNull(),
  designer: text("designer"),
  category: text("category"), // Google's coarse style
  primaryClass: text("primary_class").notNull(), // our re-derived class (§12)
  license: text("license"),
  isVariable: integer("is_variable", { mode: "boolean" }).notNull(),
  subsets: text("subsets"), // JSON array
  primaryTtf: text("primary_ttf"),
  contentHash: text("content_hash").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

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
  },
  (t) => [index("family_instance_family_idx").on(t.familyId)]
);
