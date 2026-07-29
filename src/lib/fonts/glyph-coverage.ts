import { queryOptions, useQuery } from "@tanstack/react-query";
import { BMP_BLOCKS, type UnicodeBlock } from "./unicode-blocks";

type Range = [number, number];

interface Coverage {
  ranges: Range[];
}

export interface CoveredBlock {
  block: UnicodeBlock;
  count: number;
}

export function hasCodepoint(ranges: Range[], cp: number): boolean {
  for (const [a, b] of ranges) {
    if (cp < a) return false;
    if (cp <= b) return true;
  }
  return false;
}

function countInRange(ranges: Range[], start: number, end: number): number {
  let n = 0;
  for (const [a, b] of ranges) {
    if (b < start) continue;
    if (a > end) break;
    n += Math.min(b, end) - Math.max(a, start) + 1;
  }
  return n;
}

export function blocksWithCoverage(ranges: Range[]): CoveredBlock[] {
  const out: CoveredBlock[] = [];
  for (const block of BMP_BLOCKS) {
    const count = countInRange(ranges, block.start, block.end);
    if (count > 0) out.push({ block, count });
  }
  return out;
}

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

export function useGlyphCoverage(fontId: string): {
  ranges: Range[];
  loading: boolean;
} {
  const { data, isPending } = useQuery(glyphCoverageQueryOptions(fontId));
  return { ranges: data ?? [], loading: isPending };
}
