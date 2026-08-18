import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface RawGlyphIndex {
  classes: string[];
  fonts: Record<string, number>;
}

export interface GlyphIndex {
  classes: Int32Array[];
  fonts: Record<string, number>;
}

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

import { CLUSTER_RE } from "./text-clusters";

const SKIP_RE = /[\s\p{Default_Ignorable_Code_Point}]/gu;

/** Checks precomposed OR decomposed coverage (mirrors HarfBuzz normalization). */
function clusterRenderable(ranges: Int32Array, cluster: string): boolean {
  if (coversAll(ranges, cluster)) return true;

  const chars = [...cluster.normalize("NFD")];
  const base = chars[0];
  const marks = chars.slice(1);
  if (marks.length === 0) return coversAll(ranges, base);

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

function coveredCharacters(
  index: GlyphIndex,
  fontId: string,
  text: string
): string {
  const cls = index.fonts[fontId];
  if (cls === undefined) return "";
  const ranges = index.classes[cls];
  let out = "";
  for (const ch of text) {
    if (covers(ranges, ch.codePointAt(0) as number)) out += ch;
  }
  return out;
}

function glyphIndexQueryOptions(enabled: boolean) {
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

/** Returns null when the filter is off/text is empty (meaning "do not filter"). */
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

/** Characters the font covers per the index. Empty until the index loads. */
export function useCoveredCharacters(fontId: string, text: string): string {
  const { data } = useQuery(glyphIndexQueryOptions(text.length > 0));
  return useMemo(
    () => (data ? coveredCharacters(data, fontId, text) : ""),
    [data, fontId, text]
  );
}
