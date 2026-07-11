import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  family,
  familyAxis,
  familyFeature,
  familyInstance,
  familyLanguage,
  familyScript,
} from "@/lib/db/schema";
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

// Mode A (todo §8): load the full compact catalog once; the frontend filters
// client-side. We fetch each table in full and stitch the denormalized records
// in memory — cheaper than N per-family joins for ~1700 families.
async function loadAllFonts(): Promise<FontRecord[]> {
  const [families, axes, features, instances, languages, scripts] =
    await Promise.all([
      db.select().from(family).where(eq(family.isPublished, true)),
      db.select().from(familyAxis),
      db.select().from(familyFeature),
      db.select().from(familyInstance),
      db.select().from(familyLanguage),
      db.select().from(familyScript),
    ]);

  const related: RelatedByFamily = {
    axesByFamily: groupBy(axes, (a) => a.familyId),
    featsByFamily: groupBy(features, (f) => f.familyId),
    instByFamily: groupBy(instances, (i) => i.familyId),
    langsByFamily: groupBy(languages, (l) => l.familyId),
    scriptsByFamily: groupBy(scripts, (s) => s.familyId),
  };

  return families
    .map((f) => toFontRecord(f, related))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Load a single published family by its familyDir, querying only that family's
// related rows instead of the whole catalog — the detail page needs just one.
async function loadFontById(id: string): Promise<FontRecord | null> {
  const [f] = await db
    .select()
    .from(family)
    .where(and(eq(family.familyDir, id), eq(family.isPublished, true)))
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

export const getAllFonts = createServerFn({ method: "GET" }).handler(
  (): Promise<FontRecord[]> => loadAllFonts()
);

export const getFontById = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(({ data: id }): Promise<FontRecord | null> => loadFontById(id));

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
