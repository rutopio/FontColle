import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { deriveFacets } from "./facets";
import { slugKey } from "./slug";
import type { FontRecord } from "./types";

// Fetch a static asset (built into public/, served from dist/client) by its
// absolute path, e.g. "/catalog/roboto.json". The detail loader runs on both
// sides, so this is isomorphic:
//  - client: a plain relative fetch resolves against window.location.
//  - server (SSR): a Worker fetching its own URL would recurse back into the
//    Worker instead of hitting static assets, so we go through the ASSETS
//    binding (env.ASSETS.fetch), which serves the built asset directly. The
//    request URL only needs a valid absolute form; the origin from the incoming
//    request keeps it correct behind any host.
const assetFetch = createIsomorphicFn()
  .server(async (path: string, signal?: AbortSignal) => {
    const { env } = await import("cloudflare:workers");
    const origin = new URL(getRequest().url).origin;
    return env.ASSETS.fetch(new Request(`${origin}${path}`, { signal }));
  })
  .client((path: string, signal?: AbortSignal) => fetch(path, { signal }));

// The detail page's data, fetched from static CDN assets (built by
// scripts/gen-catalog.mjs) instead of D1. Each family has its own
// public/catalog/<id>.json, so the SSR loader fetches just the one it needs and
// never loads the whole catalog (which is what made the home page hit Error
// 1102). fetch() resolves relative URLs against the request origin on the
// server too, so this works in the SSR loader and on the client alike.

// One credited-designer sibling: enough to render a link.
export interface DesignerSibling {
  id: string;
  name: string;
}

// A designer-index row: {id, name, designer} for one published family.
interface DesignerIndexRow {
  id: string;
  name: string;
  designer: string | null;
}

// Split a family's `designer` string (Google Fonts joins co-designers with
// commas) into individual, trimmed names. Matching is per-name, so a family
// pulls in every sibling crediting the same person regardless of co-designers.
function splitDesigners(designer: string | null): string[] {
  return (designer ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

// Load one published family by its URL slug (the family_dir, lowercased). Its
// static file already carries every field; we derive facets for list parity.
// Returns null when the slug has no published family (the loader 404s on that).
export async function fetchFontById(
  slug: string,
  signal?: AbortSignal
): Promise<FontRecord | null> {
  const r = await assetFetch(`/catalog/${slugKey(slug)}.json`, signal);
  if (!r.ok) return null;
  const font = (await r.json()) as FontRecord;
  return { ...font, facets: deriveFacets(font) };
}

// For each requested designer name, the other families crediting that name,
// keyed by name. Fetches the small designer index once and buckets it in JS,
// the same shape the old D1-backed getFontsByDesigners returned.
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
