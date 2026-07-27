import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

// Same isomorphic pattern as detail.ts's assetFetch: on the server a Worker
// fetching its own URL would recurse instead of hitting static assets, hence
// the ASSETS binding.
const assetFetch = createIsomorphicFn()
  .server(async (path: string, signal?: AbortSignal) => {
    const { env } = await import("cloudflare:workers");
    const origin = new URL(getRequest().url).origin;
    return env.ASSETS.fetch(new Request(`${origin}${path}`, { signal }));
  })
  .client((path: string, signal?: AbortSignal) => fetch(path, { signal }));

// The first ~24 records in the default (popularity) sort, built by
// scripts/gen-catalog.mjs. The index loader returns ONLY this slice, so a
// default `/` visit ships real font cards in the SSR HTML without the Worker
// loading the full catalog; the client still fetches it via catalogQueryOptions.
// Returns [] on any failure, so the loader never throws into an error boundary.
export async function fetchFirstPage(
  signal?: AbortSignal
): Promise<FontRecord[]> {
  try {
    const r = await assetFetch("/catalog-first.json", signal);
    if (!r.ok) return [];
    const fonts = (await r.json()) as FontRecord[];
    // Idempotent, and matches how catalog.ts normalizes client-side records.
    return withFacets(fonts);
  } catch {
    return [];
  }
}
