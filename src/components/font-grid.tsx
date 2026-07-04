import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontCard } from "@/components/font-card";
import type { FontRecord } from "@/lib/fonts/types";

interface Props {
  fonts: FontRecord[];
  previewText: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

// Column count matches the CSS breakpoints (md:2, lg:3). Measured from the
// container width so the virtualizer chunks rows correctly.
function columnsFor(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

const GAP = 16; // Tailwind gap-4
const ESTIMATED_ROW = 320; // px; measured per-row after mount

export function FontGrid({
  fonts,
  previewText,
  favorites,
  onToggleFavorite,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);
  const [scrollMargin, setScrollMargin] = useState(0);
  // SSR renders a fixed first batch so crawlers/no-JS see content; after mount
  // the window virtualizer takes over.
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      if (!listRef.current) return;
      setCols(columnsFor(listRef.current.offsetWidth));
      setScrollMargin(
        listRef.current.getBoundingClientRect().top + window.scrollY
      );
    };
    measure();
    setMounted(true);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const rowCount = Math.ceil(fonts.length / cols);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW + GAP,
    overscan: 3,
    scrollMargin,
  });

  // Re-measure when column count or list offset changes (row composition or
  // layout shifted).
  useEffect(() => {
    virtualizer.measure();
  }, [cols, scrollMargin, virtualizer]);

  if (!mounted) {
    // SSR / first paint: render the first two rows' worth of cards statically.
    const initial = fonts.slice(0, cols * 2);
    return (
      <div
        ref={listRef}
        className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {initial.map((font) => (
          <FontCard
            key={font.id}
            font={font}
            previewText={previewText}
            isFavorite={favorites.includes(font.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
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
              <div
                className="grid gap-4 pb-4"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {rowFonts.map((font) => (
                  <FontCard
                    key={font.id}
                    font={font}
                    previewText={previewText}
                    isFavorite={favorites.includes(font.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
