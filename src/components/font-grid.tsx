import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontCard } from "@/components/font-card";
import { FontRow } from "@/components/font-row";
import type { FontRecord } from "@/lib/fonts/types";

export type ViewMode = "grid" | "row";

interface Props {
  fonts: FontRecord[];
  previewText: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  view: ViewMode;
  // Sidebar-selected weight/width steps (click order), forwarded to each card.
  selectedWeights: number[];
  selectedWidths: number[];
  // Sidebar-selected variable-axis tags and their slider positions (0-100%),
  // forwarded to each card so the preview reflects the live slider drag.
  selectedAxes: string[];
  axisValues: Record<string, number>;
}

// Grid column count matches the CSS breakpoints (md:2, lg:3). Row mode is always
// a single column. Measured from the container width.
function columnsFor(width: number, view: ViewMode): number {
  if (view === "row") return 1;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

const GAP = 16; // Tailwind gap-4
// Fixed row heights so every card/line is the same size. Because the size is
// fixed we don't measure elements, so changing a preview's weight can't reflow
// the list. Cards/lines clip their own overflow to honor these.
const CARD_H = 288; // grid card height (h-72)
const LINE_H = 112; // row-mode line height (h-28)

export function FontGrid({
  fonts,
  previewText,
  favorites,
  onToggleFavorite,
  view,
  selectedWeights,
  selectedWidths,
  selectedAxes,
  axisValues,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(view === "row" ? 1 : 3);
  const [scrollMargin, setScrollMargin] = useState(0);
  // SSR renders a fixed first batch so crawlers/no-JS see content; after mount
  // the window virtualizer takes over.
  const [mounted, setMounted] = useState(false);

  // Card entrance animation only fires right after the result set changes
  // (filter/search), not on every scroll-mount. We open a short window when
  // `fonts` changes and apply the animation class only during it.
  const [animating, setAnimating] = useState(false);
  const firstRun = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `fonts` is the trigger, not read in the body — the effect fires on result-set change to open the entrance-animation window.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 260);
    return () => clearTimeout(t);
  }, [fonts]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!listRef.current) return;
      setCols(columnsFor(listRef.current.offsetWidth, view));
      setScrollMargin(
        listRef.current.getBoundingClientRect().top + window.scrollY
      );
    };
    measure();
    setMounted(true);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view]);

  const rowCount = Math.ceil(fonts.length / cols);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => (view === "row" ? LINE_H : CARD_H + GAP),
    overscan: 4,
    scrollMargin,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: cols/scrollMargin/view are the re-measure triggers, not read in the body — a change to any must re-run measurement.
  useEffect(() => {
    virtualizer.measure();
  }, [cols, scrollMargin, view, virtualizer]);

  const renderCell = (font: FontRecord) =>
    view === "row" ? (
      <FontRow
        key={font.id}
        font={font}
        previewText={previewText}
        isFavorite={favorites.includes(font.id)}
        onToggleFavorite={onToggleFavorite}
      />
    ) : (
      <FontCard
        key={font.id}
        font={font}
        previewText={previewText}
        isFavorite={favorites.includes(font.id)}
        onToggleFavorite={onToggleFavorite}
        selectedWeights={selectedWeights}
        selectedWidths={selectedWidths}
        selectedAxes={selectedAxes}
        axisValues={axisValues}
      />
    );

  if (!mounted) {
    // SSR / first paint, before the virtualizer measures. Render a clean grid
    // of skeleton placeholders (not real cards) so the first frame is regular
    // instead of showing half-streamed cards jumping around. The virtualizer
    // takes over with real cards once mounted.
    const count = view === "row" ? 8 : 9;
    // Stable keys for the fixed, never-reordered placeholder set.
    const keys = Array.from({ length: count }, (_, i) => `skeleton-${i}`);
    return (
      <div ref={listRef} className="flex-1">
        {view === "row" ? (
          <div className="flex flex-col">
            {keys.map((k) => (
              <SkeletonLine key={k} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {keys.map((k) => (
              <SkeletonCard key={k} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={listRef} className="flex-1">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {items.map((row) => {
          const start = row.index * cols;
          const rowFonts = fonts.slice(start, start + cols);
          // Guard the frame where `cols` and the virtualizer's row `count` are
          // briefly out of sync (a row.index can point past the new slice).
          if (rowFonts.length === 0) return null;
          // Key by the row's contents, not its position. When `cols` changes
          // (measure after mount, resize) each index maps to a different slice
          // of fonts; a positional key (row.index) makes React reuse the old
          // row's DOM and cells get stranded in the wrong cells. Keying by the
          // first font's id forces a correct remount.
          return (
            <div
              key={rowFonts[0]?.id ?? row.key}
              data-index={row.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {view === "row" ? (
                <div className={animating ? "animate-card-in" : undefined}>
                  {rowFonts.map(renderCell)}
                </div>
              ) : (
                <div
                  className={`grid gap-4 pb-4 ${animating ? "animate-card-in" : ""}`}
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {rowFonts.map(renderCell)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Loading placeholders for the pre-mount frame. Match the real card/line
// heights (h-72 / h-28) so nothing jumps when the virtualizer takes over.
function SkeletonCard() {
  return (
    <div className="flex h-72 flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="h-4 w-[85%] animate-pulse rounded bg-muted" />
        <div className="h-4 w-[70%] animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-auto h-3 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

function SkeletonLine() {
  return (
    <div className="flex h-28 flex-col justify-center gap-3 border-b">
      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
