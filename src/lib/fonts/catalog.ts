import { queryOptions } from "@tanstack/react-query";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

async function resolveCatalogUrl(signal?: AbortSignal): Promise<string> {
  try {
    const m = await fetch("/catalog-manifest.json", { signal });
    if (!m.ok) return "/catalog.json";
    const { path } = (await m.json()) as { path?: string };
    return path ?? "/catalog.json";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return "/catalog.json";
  }
}

export function catalogQueryOptions() {
  return queryOptions({
    queryKey: ["catalog"],
    queryFn: async ({ signal }): Promise<FontRecord[]> => {
      const url = await resolveCatalogUrl(signal);
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error(`catalog fetch failed: ${r.status}`);
      const fonts = (await r.json()) as FontRecord[];
      return withFacets(fonts);
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
