import { queryOptions, useQuery } from "@tanstack/react-query";
import { BMP_BLOCKS, type UnicodeBlock } from "./unicode-blocks";

// Per-font Unicode coverage, driving the Glyphs page. The backfill script
// (backfill_glyph_coverage.py) writes public/glyphs/<id>.json holding the
// font's BMP codepoints, run-length encoded as inclusive [start, end] ranges.
// We fetch that on demand and intersect it with the BMP block list so the
// sidebar shows only covered blocks and the grid shows only present glyphs.

// Inclusive [start, end] codepoint range.
type Range = [number, number];

interface Coverage {
  ranges: Range[];
}

// A block the font covers, with how many of its codepoints are present.
export interface CoveredBlock {
  block: UnicodeBlock;
  count: number;
}

// True if codepoint `cp` falls in one of the (sorted, disjoint) ranges.
export function hasCodepoint(ranges: Range[], cp: number): boolean {
  // Linear scan is fine: blocks are small and ranges are already narrowed to a
  // block before per-cell lookups in practice.
  for (const [a, b] of ranges) {
    if (cp < a) return false;
    if (cp <= b) return true;
  }
  return false;
}

// Count how many codepoints in [start, end] are present across `ranges`.
function countInRange(ranges: Range[], start: number, end: number): number {
  let n = 0;
  for (const [a, b] of ranges) {
    if (b < start) continue;
    if (a > end) break;
    n += Math.min(b, end) - Math.max(a, start) + 1;
  }
  return n;
}

// The BMP blocks the font has at least one glyph in, each with its present
// count, in block order.
export function blocksWithCoverage(ranges: Range[]): CoveredBlock[] {
  const out: CoveredBlock[] = [];
  for (const block of BMP_BLOCKS) {
    const count = countInRange(ranges, block.start, block.end);
    if (count > 0) out.push({ block, count });
  }
  return out;
}

// Query for a font's coverage ranges. Coverage files are immutable per font, so
// they never go stale, cache them forever, so revisiting a font is a cache hit.
function glyphCoverageQueryOptions(fontId: string) {
  return queryOptions({
    queryKey: ["glyph-coverage", fontId],
    queryFn: async ({ signal }): Promise<Range[]> => {
      const r = await fetch(`/glyphs/${fontId}.json`, { signal });
      if (!r.ok) return [];
      const d = (await r.json()) as Coverage;
      return d.ranges ?? [];
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

// Fetch a font's coverage ranges (empty until loaded, and on error). Keyed by
// font id; React Query cancels the in-flight request and refetches on change.
export function useGlyphCoverage(fontId: string): {
  ranges: Range[];
  loading: boolean;
} {
  const { data, isPending } = useQuery(glyphCoverageQueryOptions(fontId));
  return { ranges: data ?? [], loading: isPending };
}
