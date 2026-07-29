import type { CSSProperties, RefObject } from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlyphCompact } from "@/hooks/use-mobile";
import type { FontRecord } from "@/lib/fonts/types";
import { BMP_BLOCKS } from "@/lib/fonts/unicode-blocks";
import {
  BlockGrid,
  COLS_DESKTOP,
  COLS_MOBILE,
  hex,
  LABEL_W,
  type Range,
} from "./glyph-block-grid";

export function GlyphsPanel({
  font,
  fontLoaded,
  blockName,
  ranges,
  loading,
  scrollRef,
  highlightCp,
}: {
  font: FontRecord;
  fontLoaded: boolean;
  blockName: string;
  ranges: Range[];
  loading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  highlightCp: number | null;
}) {
  const active = useMemo(
    () => BMP_BLOCKS.find((b) => b.name === blockName) ?? BMP_BLOCKS[0],
    [blockName]
  );

  const onCopy = useCallback(async (cp: number) => {
    try {
      await navigator.clipboard.writeText(String.fromCodePoint(cp));
      toast.success(`Copied U+${hex(cp)}`, {
        description: String.fromCodePoint(cp),
      });
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  const glyphStyle: CSSProperties = {
    fontFamily: `"${font.name}", "Adobe Blank"`,
    letterSpacing: "normal",
  };
  void fontLoaded;

  return (
    <div className="w-full min-w-0 pb-48 md:pb-0">
      <div className="mb-8 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-2xl">{active.name}</h2>
        <span className="font-mono text-muted-foreground text-xs">
          U+{hex(active.start)}–U+{hex(active.end)}
        </span>
      </div>
      {loading ? (
        <GlyphGridSkeleton />
      ) : (
        <BlockGrid
          key={active.name}
          block={active}
          ranges={ranges}
          style={glyphStyle}
          scrollRef={scrollRef}
          highlightCp={highlightCp}
          onCopy={onCopy}
        />
      )}
    </div>
  );
}

function GlyphGridSkeleton() {
  const COLS = useGlyphCompact() ? COLS_MOBILE : COLS_DESKTOP;
  const labelW = COLS === COLS_DESKTOP ? LABEL_W : 0;
  const gridCols = labelW
    ? `${labelW}px repeat(${COLS}, minmax(0, 1fr))`
    : `repeat(${COLS}, minmax(0, 1fr))`;
  const ROWS = 8;

  return (
    <div role="status" aria-busy="true" aria-label="Loading glyphs">
      {COLS === COLS_DESKTOP && (
        <div
          className="grid gap-px pb-1"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div />
          {Array.from({ length: COLS }, (_, c) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
              key={`skeleton-col:${c}`}
              className="mx-auto h-2.5 w-2.5 rounded-sm"
            />
          ))}
        </div>
      )}
      {Array.from({ length: ROWS }, (_, r) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
          key={`skeleton-row:${r}`}
          className="grid gap-px"
          style={{ gridTemplateColumns: gridCols }}
        >
          {labelW ? <div /> : null}
          {Array.from({ length: COLS }, (_, c) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
              key={`skeleton-cell:${r}:${c}`}
              className="aspect-square rounded-sm"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
