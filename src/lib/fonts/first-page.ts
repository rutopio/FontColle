import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { withFacets } from "./facets";
import type { FontRecord } from "./types";

const assetFetch = createIsomorphicFn()
  .server(async (path: string, signal?: AbortSignal) => {
    const { env } = await import("cloudflare:workers");
    const origin = new URL(getRequest().url).origin;
    return env.ASSETS.fetch(new Request(`${origin}${path}`, { signal }));
  })
  .client((path: string, signal?: AbortSignal) => fetch(path, { signal }));

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
