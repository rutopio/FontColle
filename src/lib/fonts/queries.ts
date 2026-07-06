import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
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

  const axesByFamily = groupBy(axes, (a) => a.familyId);
  const featsByFamily = groupBy(features, (f) => f.familyId);
  const instByFamily = groupBy(instances, (i) => i.familyId);
  const langsByFamily = groupBy(languages, (l) => l.familyId);
  const scriptsByFamily = groupBy(scripts, (s) => s.familyId);

  return families
    .map((f): FontRecord => {
      return {
        id: f.familyDir,
        name: f.name,
        designer: f.designer,
        class: f.primaryClass,
        category: f.category,
        license: f.license,
        isVariable: f.isVariable,
        subsets: parseJson<string[]>(f.subsets, []),
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
        features: (featsByFamily.get(f.id) ?? [])
          .map((x) => x.featureTag)
          .sort(),
        facets: [], // derived client-side from axes/features/subsets
        languages: (langsByFamily.get(f.id) ?? []).map((l) => l.langId).sort(),
        scripts: (scriptsByFamily.get(f.id) ?? []).map((s) => s.script).sort(),
        cjkCoverage: parseJson<Record<string, number>>(f.cjkCoverage, {}),
        version: f.version,
        versionString: f.versionString,
        dateAdded: f.dateAdded,
        weightClass: f.weightClass,
        widthClass: f.widthClass,
        weights: parseJson<number[]>(f.weights, []),
        glyphCount: f.glyphCount,
        charCount: f.charCount,
        primaryScript: f.primaryScript,
        popularityRank: f.popularityRank,
        trendingRank: f.trendingRank,
        lastModified: f.lastModified,
        specimen: f.specimen,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const getAllFonts = createServerFn({ method: "GET" }).handler(
  (): Promise<FontRecord[]> => loadAllFonts()
);

export const getFontById = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<FontRecord | null> => {
    const all = await loadAllFonts();
    return all.find((f) => f.id === id) ?? null;
  });

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
