import languagesRaw from "@/data/languages.json";
import scriptsRaw from "@/data/scripts.json";
import vendorsRaw from "@/data/vendors.json";

export interface LanguageMeta {
  name: string;
  script: string;
  population: number;
  regions: string[];
}

// Must match REGION_ORDER in scripts/harvester/langcov.py.
const NO_LANGUAGE_REGION = "Constructed & historical";

const LANGUAGE_REGIONS = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
  NO_LANGUAGE_REGION,
] as const;

const scripts = scriptsRaw as Record<string, string>;
const languages = languagesRaw as Record<string, LanguageMeta>;
const vendors = vendorsRaw as Record<string, string>;

export function scriptLabel(code: string): string {
  return scripts[code] ?? code;
}

export function languageLabel(id: string): string {
  return languages[id]?.name ?? id;
}

export function vendorLabel(code: string): string {
  return vendors[code] ?? code;
}

function languagePopulation(id: string): number {
  return languages[id]?.population ?? 0;
}

function languageRegions(id: string): string[] {
  const r = languages[id]?.regions;
  return r && r.length > 0 ? r : [NO_LANGUAGE_REGION];
}

function bucketByRegion<T>(
  items: T[],
  idOf: (item: T) => string
): { region: string; items: T[] }[] {
  const byRegion = new Map<string, T[]>();
  for (const item of items) {
    for (const r of languageRegions(idOf(item))) {
      const bucket = byRegion.get(r);
      if (bucket) bucket.push(item);
      else byRegion.set(r, [item]);
    }
  }
  return LANGUAGE_REGIONS.filter((r) => byRegion.has(r)).map((region) => ({
    region,
    items: byRegion.get(region) as T[],
  }));
}

export function groupLanguagesByRegion(
  ids: string[]
): { region: string; ids: string[] }[] {
  const byName = (a: string, b: string) =>
    languageLabel(a).localeCompare(languageLabel(b));
  return bucketByRegion(ids, (id) => id).map(({ region, items }) => ({
    region,
    ids: [...items].sort(byName),
  }));
}

export interface LanguageRegionGroup {
  region: string;
  items: [string, number][];
  topNSet: Set<string>;
}

export function groupLanguageCountsByRegion(
  items: [string, number][],
  topN: number
): LanguageRegionGroup[] {
  return bucketByRegion(items, ([id]) => id).map(
    ({ region, items: regionItems }) => {
      const top = [...regionItems]
        .sort((a, b) => languagePopulation(b[0]) - languagePopulation(a[0]))
        .slice(0, topN);
      return {
        region,
        items: regionItems,
        topNSet: new Set(top.map(([id]) => id)),
      };
    }
  );
}

const SCRIPT_POPULATION: Record<string, number> = {};
for (const meta of Object.values(languages)) {
  if (!meta.script) continue;
  SCRIPT_POPULATION[meta.script] =
    (SCRIPT_POPULATION[meta.script] ?? 0) + (meta.population ?? 0);
}

export function scriptPopulation(code: string): number {
  return SCRIPT_POPULATION[code] ?? 0;
}
