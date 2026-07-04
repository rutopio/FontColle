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
const ESTIMATED_ROW = 320; // grid card row estimate
const ESTIMATED_LINE = 128; // row-mode line estimate

export function FontGrid({
  fonts,
  previewText,
  favorites,
  onToggleFavorite,
  view,
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
    estimateSize: () => (view === "row" ? ESTIMATED_LINE : ESTIMATED_ROW + GAP),
    overscan: 4,
    scrollMargin,
  });

  // Re-measure when column count, view, or list offset changes.
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
      />
    );

  if (!mounted) {
    // SSR / first paint: render a small static batch.
    const initial = fonts.slice(0, view === "row" ? 8 : cols * 2);
    return (
      <div ref={listRef} className="flex-1">
        {view === "row" ? (
          <div>{initial.map(renderCell)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {initial.map(renderCell)}
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
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
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
