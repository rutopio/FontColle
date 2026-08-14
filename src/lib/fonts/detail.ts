import { assetFetch } from "./asset-fetch";
import { deriveFacets } from "./facets";
import { slugKey } from "./slug";
import type { FontRecord } from "./types";

export interface DesignerSibling {
  id: string;
  name: string;
}

interface DesignerIndexRow {
  id: string;
  name: string;
  designer: string | null;
}

function splitDesigners(designer: string | null): string[] {
  return (designer ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

export async function fetchFontById(
  slug: string,
  signal?: AbortSignal
): Promise<FontRecord | null> {
  const r = await assetFetch(`/catalog/${slugKey(slug)}.json`, signal);
  if (!r.ok) return null;
  const font = (await r.json()) as FontRecord;
  return { ...font, facets: deriveFacets(font) };
}

export async function fetchFontsByDesigners(
  names: string[],
  excludeId: string,
  signal?: AbortSignal
): Promise<Record<string, DesignerSibling[]>> {
  const wanted = new Set(names);
  const result: Record<string, DesignerSibling[]> = {};
  for (const name of names) result[name] = [];
  if (wanted.size === 0) return result;

  const r = await assetFetch("/designer-index.json", signal);
  if (!r.ok) return result;
  const rows = (await r.json()) as DesignerIndexRow[];

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
