import { queryOptions } from "@tanstack/react-query";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

// Keep this OFF the Worker: building it per request exceeded the per-request
// limits (Error 1102). It changes only when the daily harvest redeploys, so it
// is effectively immutable for a session and cached forever client-side.
//
// Cache-busting: a short-TTL manifest points at a content-hashed, year-immutable
// file, so a redeploy changes the hash and busts the CDN cache. Any manifest
// failure falls back to the plain /catalog.json, which is always written too.
async function resolveCatalogUrl(signal?: AbortSignal): Promise<string> {
  try {
    const m = await fetch("/catalog-manifest.json", { signal });
    if (!m.ok) return "/catalog.json";
    const { path } = (await m.json()) as { path?: string };
    return path ?? "/catalog.json";
  } catch (err) {
    // Re-throw genuine aborts so react-query treats the query as cancelled,
    // not failed; any other manifest error falls back to the plain catalog.
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
      // Idempotent: backfills any record that somehow lacks facets.
      return withFacets(fonts);
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
