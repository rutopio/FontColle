import { queryOptions } from "@tanstack/react-query";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

// The published catalog, fetched as a static CDN asset (public/catalog.json,
// emitted at build time by scripts/gen-catalog.mjs). Previously the home page
// loader rebuilt this in the Worker from six full-table D1 reads on every visit
// (~14 MB in memory, serialized into the SSR HTML), which exceeded the Worker's
// per-request limits and returned Error 1102. Fetching a prebuilt JSON on the
// client moves that work off the Worker and lets the CDN cache it.
//
// The catalog only changes when the daily harvest CI redeploys, so it's
// effectively immutable for a session — cache it forever client-side.
export function catalogQueryOptions() {
  return queryOptions({
    queryKey: ["catalog"],
    queryFn: async ({ signal }): Promise<FontRecord[]> => {
      const r = await fetch("/catalog.json", { signal });
      if (!r.ok) throw new Error(`catalog fetch failed: ${r.status}`);
      const fonts = (await r.json()) as FontRecord[];
      // fonts.json already carries facets, but withFacets is idempotent and
      // backfills any record that somehow lacks them.
      return withFacets(fonts);
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
