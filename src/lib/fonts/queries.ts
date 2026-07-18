import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  family,
  familyAxis,
  familyFeature,
  familyInstance,
  familyLanguage,
  familyScript,
} from "@/lib/db/schema";
import { slugKey } from "./slug";
import type { FontRecord } from "./types";

// A family row (from `family`) plus its related rows, grouped by family id.
type FamilyRow = typeof family.$inferSelect;
interface RelatedByFamily {
  axesByFamily: Map<number, (typeof familyAxis.$inferSelect)[]>;
  featsByFamily: Map<number, (typeof familyFeature.$inferSelect)[]>;
  instByFamily: Map<number, (typeof familyInstance.$inferSelect)[]>;
  langsByFamily: Map<number, (typeof familyLanguage.$inferSelect)[]>;
  scriptsByFamily: Map<number, (typeof familyScript.$inferSelect)[]>;
}

// Stitch one denormalized FontRecord from a family row and its related rows.
function toFontRecord(f: FamilyRow, related: RelatedByFamily): FontRecord {
  const {
    axesByFamily,
    featsByFamily,
    instByFamily,
    langsByFamily,
    scriptsByFamily,
  } = related;
  return {
    id: f.familyDir,
    name: f.name,
    displayName: f.displayName,
    designer: f.designer,
    class: f.primaryClass,
    category: f.category,
    license: f.license,
    isVariable: f.isVariable,
    subsets: parseJson<string[]>(f.subsets, []),
    repositoryUrl: f.repositoryUrl,
    isNoto: f.isNoto,
    isBrandFont: f.isBrandFont,
    isOpenSource: f.isOpenSource,
    axes: (axesByFamily.get(f.id) ?? []).map((a) => ({
      tag: a.axisTag,
      name: a.axisName,
      min: a.minValue,
      default: a.defaultValue,
      max: a.maxValue,
    })),
    instances: (instByFamily.get(f.id) ?? []).map((i) => ({
      name: i.name,
      coords: parseJson<Record<string, number>>(i.coords, {}),
      italic: i.italic,
    })),
    features: (featsByFamily.get(f.id) ?? []).map((x) => x.featureTag).sort(),
    facets: [], // derived client-side from axes/features/subsets
    colorTables: parseJson<string[]>(f.colorTables, []),
    languages: (langsByFamily.get(f.id) ?? []).map((l) => l.langId).sort(),
    scripts: (scriptsByFamily.get(f.id) ?? []).map((s) => s.script).sort(),
    cjkCoverage: parseJson<Record<string, number>>(f.cjkCoverage, {}),
    version: f.version,
    versionString: f.versionString,
    dateAdded: f.dateAdded,
    firstCommitDate: f.firstCommitDate,
    weightClass: f.weightClass,
    widthClass: f.widthClass,
    weights: parseJson<number[]>(f.weights, []),
    glyphCount: f.glyphCount,
    charCount: f.charCount,
    primaryScript: f.primaryScript,
    popularityRank: f.popularityRank,
    trendingRank: f.trendingRank,
    lastModified: f.lastModified,
    versionHistory: parseJson<{ version: string; date: string }[]>(
      f.versionHistory,
      []
    ),
    specimen: f.specimen,
    about: f.about,
    designerProfiles: parseJson<FontRecord["designerProfiles"]>(
      f.designerProfiles,
      []
    ),
    licenseHeader: f.licenseHeader,
    tags: parseJson<Record<string, number>>(f.tags, {}),
    unitsPerEm: f.unitsPerEm,
    xHeight: f.xHeight,
    capHeight: f.capHeight,
    italicAngle: f.italicAngle,
    hheaAscender: f.hheaAscender,
    hheaDescender: f.hheaDescender,
    hheaLineGap: f.hheaLineGap,
    typoAscender: f.typoAscender,
    typoDescender: f.typoDescender,
    typoLineGap: f.typoLineGap,
    winAscent: f.winAscent,
    winDescent: f.winDescent,
    useTypoMetrics: f.useTypoMetrics,
    avgCharWidth: f.avgCharWidth,
    contrast: f.contrast,
    isMonospace: f.isMonospace,
    hasHinting: f.hasHinting,
    vendorId: f.vendorId,
    fileSize: f.fileSize,
  };
}

// The full catalog is no longer loaded here: the home page fetches a prebuilt
// static JSON (public/catalog.json) on the client instead of the Worker
// rebuilding it from D1 per request, which exceeded the Worker's limits
// (Error 1102). See src/lib/fonts/catalog.ts and scripts/gen-catalog.mjs.

// Load a single published family by its URL slug, querying only that family's
// related rows instead of the whole catalog — the detail page needs just one.
// The slug is the family_dir (the repo dir, e.g. "alegreyasans"): unique,
// lowercase, no spaces/underscores. Matched case-insensitively so /specimen/Inter
// and /specimen/inter both resolve. family_dir is unique, so at most one matches.
async function loadFontById(slug: string): Promise<FontRecord | null> {
  const key = slugKey(slug);
  const [f] = await db
    .select()
    .from(family)
    .where(
      and(
        sql`lower(${family.familyDir}) = ${key}`,
        eq(family.isPublished, true)
      )
    )
    .limit(1);
  if (!f) return null;

  const [axes, features, instances, languages, scripts] = await Promise.all([
    db.select().from(familyAxis).where(eq(familyAxis.familyId, f.id)),
    db.select().from(familyFeature).where(eq(familyFeature.familyId, f.id)),
    db.select().from(familyInstance).where(eq(familyInstance.familyId, f.id)),
    db.select().from(familyLanguage).where(eq(familyLanguage.familyId, f.id)),
    db.select().from(familyScript).where(eq(familyScript.familyId, f.id)),
  ]);

  return toFontRecord(f, {
    axesByFamily: groupBy(axes, (a) => a.familyId),
    featsByFamily: groupBy(features, (x) => x.familyId),
    instByFamily: groupBy(instances, (i) => i.familyId),
    langsByFamily: groupBy(languages, (l) => l.familyId),
    scriptsByFamily: groupBy(scripts, (s) => s.familyId),
  });
}

export const getFontById = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(({ data: id }): Promise<FontRecord | null> => loadFontById(id));

// The designer tab lists other families by each credited designer. We only need
// each sibling's id + name for a link, so select just those columns rather than
// stitching full records. `excludeId` drops the family currently being viewed.
export interface DesignerSibling {
  id: string;
  name: string;
}

// Split a family's `designer` string (Google Fonts joins co-designers with
// commas) into individual, trimmed names. Matching is per-name, not on the whole
// string, so "Meir Sadan" pulls in every family crediting them, regardless of
// which other designers share the credit.
function splitDesigners(designer: string | null): string[] {
  return (designer ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

// For each requested designer name, the other families crediting that name,
// keyed by name. One DB round-trip: load every published family's designer
// string once, then bucket in JS by comma-split name.
async function loadFontsByDesigners(
  names: string[],
  excludeId: string
): Promise<Record<string, DesignerSibling[]>> {
  const wanted = new Set(names);
  const result: Record<string, DesignerSibling[]> = {};
  for (const name of names) result[name] = [];
  if (wanted.size === 0) return result;

  const rows = await db
    .select({
      id: family.familyDir,
      name: family.name,
      designer: family.designer,
    })
    .from(family)
    .where(eq(family.isPublished, true));

  for (const row of rows) {
    if (row.id === excludeId) continue;
    for (const d of splitDesigners(row.designer)) {
      if (wanted.has(d)) result[d].push({ id: row.id, name: row.name });
    }
  }
  for (const name of names) {
    result[name].sort((a, b) => a.name.localeCompare(b.name));
  }
  return result;
}

export const getFontsByDesigners = createServerFn({ method: "GET" })
  .validator((input: { names: string[]; excludeId: string }) => input)
  .handler(
    ({ data }): Promise<Record<string, DesignerSibling[]>> =>
      loadFontsByDesigners(data.names, data.excludeId)
  );

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const arr = map.get(k);
    if (arr) arr.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
