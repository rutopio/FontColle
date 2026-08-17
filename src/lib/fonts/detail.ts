import { assetFetch } from "./asset-fetch";
import { deriveFacets } from "./facets";
import { slugKey } from "./slug";
import type { FontRecord } from "./types";

export type { DesignerSibling } from "./types";

export async function fetchFontById(
  slug: string,
  signal?: AbortSignal
): Promise<FontRecord | null> {
  const r = await assetFetch(`/catalog/${slugKey(slug)}.json`, signal);
  if (!r.ok) return null;
  const font = (await r.json()) as FontRecord;
  return { ...font, facets: deriveFacets(font) };
}
