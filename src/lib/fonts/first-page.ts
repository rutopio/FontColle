import { assetFetch } from "./asset-fetch";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

export async function fetchFirstPage(
  signal?: AbortSignal
): Promise<FontRecord[]> {
  try {
    const r = await assetFetch("/catalog-first.json", signal);
    if (!r.ok) return [];
    const fonts = (await r.json()) as FontRecord[];
    return withFacets(fonts);
  } catch {
    return [];
  }
}
