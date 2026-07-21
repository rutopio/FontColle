import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

// Fetch a static asset (built into public/, served from dist/client) by its
// absolute path. Same isomorphic pattern as detail.ts's assetFetch:
//  - client: a plain relative fetch resolves against window.location.
//  - server (SSR): the Worker fetching its own URL would recurse into the Worker
//    instead of hitting static assets, so we go through the ASSETS binding
//    (env.ASSETS.fetch), which serves the built asset directly. The request URL
//    only needs a valid absolute form; the incoming request's origin supplies it.
const assetFetch = createIsomorphicFn()
  .server(async (path: string, signal?: AbortSignal) => {
    const { env } = await import("cloudflare:workers");
    const origin = new URL(getRequest().url).origin;
    return env.ASSETS.fetch(new Request(`${origin}${path}`, { signal }));
  })
  .client((path: string, signal?: AbortSignal) => fetch(path, { signal }));

// The home page's first-page slice: the first ~24 FontRecords in the default
// (popularity) sort, built at build time by scripts/gen-catalog.mjs. The index
// loader returns ONLY this slice, so a default `/` visit ships real font cards
// and /instances/ links in the SSR HTML, without the Worker ever loading the
// full 14 MB catalog (Error 1102). The full catalog still loads client-side via
// catalogQueryOptions, exactly as before. Returns [] on any fetch/parse failure
// so the loader never throws the home page into an error boundary.
export async function fetchFirstPage(
  signal?: AbortSignal
): Promise<FontRecord[]> {
  try {
    const r = await assetFetch("/catalog-first.json", signal);
    if (!r.ok) return [];
    const fonts = (await r.json()) as FontRecord[];
    // catalog-first.json already carries facets, but withFacets is idempotent
    // and matches how the client catalog normalizes records (catalog.ts).
    return withFacets(fonts);
  } catch {
    return [];
  }
}
