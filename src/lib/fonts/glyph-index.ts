import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Catalog-wide Unicode coverage, for answering "which fonts can render this
 * preview sentence?" on the list page. The per-font files behind the Glyphs
 * panel (public/glyphs/<id>.json, ~15 MB total) are far too many to fetch here,
 * so scripts/gen-glyph-index.mjs folds them into one deduplicated file: 2028
 * fonts share only ~1500 distinct coverage sets.
 */
interface RawGlyphIndex {
  classes: string[];
  fonts: Record<string, number>;
}

export interface GlyphIndex {
  /** One flat [start, end, start, end, …] pair list per coverage class. */
  classes: Int32Array[];
  fonts: Record<string, number>;
}

/** Inverse of encodeRanges() in scripts/gen-glyph-index.mjs. */
function decodeRanges(encoded: string): Int32Array {
  if (!encoded) return new Int32Array(0);
  const parts = encoded.split(",");
  const out = new Int32Array(parts.length * 2);
  let prev = 0;
  for (let i = 0; i < parts.length; i++) {
    const dot = parts[i].indexOf(".");
    const gap =
      dot < 0
        ? Number.parseInt(parts[i], 36)
        : Number.parseInt(parts[i].slice(0, dot), 36);
    const len = dot < 0 ? 0 : Number.parseInt(parts[i].slice(dot + 1), 36);
    const start = prev + gap;
    const end = start + len;
    out[i * 2] = start;
    out[i * 2 + 1] = end;
    prev = end;
  }
  return out;
}

export function decodeGlyphIndex(raw: RawGlyphIndex): GlyphIndex {
  return {
    classes: raw.classes.map(decodeRanges),
    fonts: raw.fonts,
  };
}

function covers(ranges: Int32Array, cp: number): boolean {
  let lo = 0;
  let hi = ranges.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cp < ranges[mid * 2]) hi = mid - 1;
    else if (cp > ranges[mid * 2 + 1]) lo = mid + 1;
    else return true;
  }
  return false;
}

const coversAll = (ranges: Int32Array, s: string): boolean => {
  for (const ch of s) {
    if (!covers(ranges, ch.codePointAt(0) as number)) return false;
  }
  return true;
};

/**
 * A base character plus any combining marks that follow it. Marks with no base
 * (a string that opens with one) form a cluster of their own.
 */
const CLUSTER_RE = /\P{M}\p{M}*|\p{M}+/gu;

/**
 * Whitespace never needs a glyph, and default-ignorable characters (ZWJ, ZWNJ,
 * variation selectors, BOM) are the shaper's business, not the cmap's.
 */
const SKIP_RE = /[\s\p{Default_Ignorable_Code_Point}]/gu;

/**
 * Whether a cluster survives the normalization a shaper applies before it ever
 * looks a glyph up. HarfBuzz decomposes the cluster and then recomposes what it
 * can, so a font passes if it covers EITHER the precomposed character or the
 * base plus each mark — checking raw codepoints against the cmap alone rejects
 * fonts that render the text perfectly well (measured: 89 extra families match
 * "Tiếng Việt" once this runs).
 */
function clusterRenderable(ranges: Int32Array, cluster: string): boolean {
  if (coversAll(ranges, cluster)) return true;

  const chars = [...cluster.normalize("NFD")];
  const base = chars[0];
  const marks = chars.slice(1);
  if (marks.length === 0) return coversAll(ranges, base);

  // Fold each mark into the base while the composition stays a single covered
  // character; whatever will not compose has to stand on its own in the cmap.
  let composed = base;
  const standalone: string[] = [];
  for (const mark of marks) {
    const next = (composed + mark).normalize("NFC");
    if (
      [...next].length === 1 &&
      covers(ranges, next.codePointAt(0) as number)
    ) {
      composed = next;
      continue;
    }
    standalone.push(mark);
  }
  if (!coversAll(ranges, composed)) return false;
  return standalone.every((m) => covers(ranges, m.codePointAt(0) as number));
}

export function canRenderWithCoverage(
  ranges: Int32Array,
  text: string
): boolean {
  const stripped = text.replace(SKIP_RE, "");
  if (!stripped) return true;
  const clusters = stripped.match(CLUSTER_RE);
  if (!clusters) return true;
  return clusters.every((c) => clusterRenderable(ranges, c));
}

/**
 * Ids of every font in the index that can render `text`.
 *
 * Only indexed fonts can be returned, so a font the index does not cover is
 * filtered out rather than kept. The index is built from the same glyph data
 * the catalog is built from and is currently a superset of it, so this is not
 * reachable today; if the two ever diverge, the missing fonts disappear from
 * the list while the filter is on.
 */
export function renderableFontIds(
  index: GlyphIndex,
  text: string
): Set<string> {
  const passing = new Set<number>();
  for (let i = 0; i < index.classes.length; i++) {
    if (canRenderWithCoverage(index.classes[i], text)) passing.add(i);
  }
  const ids = new Set<string>();
  for (const [id, cls] of Object.entries(index.fonts)) {
    if (passing.has(cls)) ids.add(id);
  }
  return ids;
}

export function glyphIndexQueryOptions(enabled: boolean) {
  return queryOptions({
    queryKey: ["glyph-index"],
    queryFn: async ({ signal }): Promise<GlyphIndex> => {
      const r = await fetch("/glyph-index.json", { signal });
      if (!r.ok) throw new Error(`glyph index fetch failed: ${r.status}`);
      return decodeGlyphIndex((await r.json()) as RawGlyphIndex);
    },
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Font ids that can render `text`, or null while the filter is off, the text is
 * empty, or the index has not arrived yet — null means "do not filter".
 */
export function useRenderableFontIds(
  text: string,
  enabled: boolean
): Set<string> | null {
  const active = enabled && text.trim().length > 0;
  const { data } = useQuery(glyphIndexQueryOptions(active));
  return useMemo(() => {
    if (!(active && data)) return null;
    return renderableFontIds(data, text);
  }, [active, data, text]);
}
