import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FontCard } from "@/components/font-card";
import { FontRow } from "@/components/font-row";
import type { FilterSelection } from "@/lib/fonts/filter";
import type { FontRecord } from "@/lib/fonts/types";
import { Separator } from "./ui/separator";

export type ViewMode = "grid" | "row";

interface Props {
  fonts: FontRecord[];
  previewText: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  view: ViewMode;
  selection: FilterSelection;
  axisValues: Record<string, number>;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function columnsFor(width: number, view: ViewMode): number {
  if (view === "row") return 1;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

const CARD_H = 288; // h-72
const LINE_H = 128; // h-32

const rowKey = (view: ViewMode, firstFontId: string) =>
  `${view}-${firstFontId}`;

const GAP = 16; // Tailwind gap-4

export function FontGrid({
  fonts,
  previewText,
  favorites,
  onToggleFavorite,
  view,
  selection,
  axisValues,
  scrollRef,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const [cols, setCols] = useState(view === "row" ? 1 : 3);
  const [virtualizerReady, setVirtualizerReady] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      if (!listRef.current) return;
      setCols(columnsFor(listRef.current.offsetWidth, view));
    };
    measure();
    setVirtualizerReady(true);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view]);

  const rowCount = Math.ceil(fonts.length / cols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (view === "row" ? LINE_H : CARD_H + GAP),
    overscan: 4,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: cols/view are the re-measure triggers, not read in the body, a change to either must re-run measurement.
  useEffect(() => {
    virtualizer.measure();
  }, [cols, view, virtualizer]);

  const renderCell = (font: FontRecord) =>
    view === "row" ? (
      <div className="flex flex-col">
        <FontRow
          key={font.id}
          font={font}
          previewText={previewText}
          isFavorite={favSet.has(font.id)}
          onToggleFavorite={onToggleFavorite}
          selection={selection}
          axisValues={axisValues}
        />
        <Separator className="px-4" />
      </div>
    ) : (
      <FontCard
        key={font.id}
        font={font}
        previewText={previewText}
        isFavorite={favSet.has(font.id)}
        onToggleFavorite={onToggleFavorite}
        selection={selection}
        axisValues={axisValues}
      />
    );

  if (!virtualizerReady) {
    return (
      <div ref={listRef} className="flex-1">
        <SkeletonGrid view={view} />
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
          if (rowFonts.length === 0) return null;
          return (
            <div
              key={rowKey(view, rowFonts[0]?.id ?? String(row.key))}
              data-index={row.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
              }}
            >
              {view === "row" ? (
                <div>{rowFonts.map(renderCell)}</div>
              ) : (
                <div
                  className="grid gap-4 pb-4"
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

export function SkeletonGrid({ view }: { view: ViewMode }) {
  const count = view === "row" ? 8 : 9;
  const keys = Array.from({ length: count }, (_, i) => `skeleton-${i}`);
  return view === "row" ? (
    <div className="flex flex-col">
      {keys.map((k) => (
        <SkeletonLine key={k} />
      ))}
    </div>
  ) : (
    <div className="@container">
      <div className="grid @min-[1024px]:grid-cols-3 @min-[768px]:grid-cols-2 grid-cols-1 gap-4">
        {keys.map((k) => (
          <SkeletonCard key={k} />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-72 flex-col gap-4 rounded-lg border bg-card p-4">
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
    <div className="flex h-32 flex-col justify-center gap-3 border-b px-2">
      <div className="h-3 w-40 max-w-[60%] animate-pulse rounded bg-muted" />
      <div className="h-15 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
