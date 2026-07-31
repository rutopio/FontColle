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

// h-72 with border-box sizing: the 1px bottom gridline sits inside the 288px,
// so rows must advance by exactly this or a bare strip opens above each line.
const CARD_H = 288;
const LINE_H = 128; // h-32

const rowKey = (view: ViewMode, firstFontId: string) =>
  `${view}-${firstFontId}`;

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
    estimateSize: () => (view === "row" ? LINE_H : CARD_H),
    overscan: 4,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: cols/view are the re-measure triggers, not read in the body, a change to either must re-run measurement.
  useEffect(() => {
    virtualizer.measure();
  }, [cols, view, virtualizer]);

  const renderCell = (font: FontRecord, isLastRow = false) =>
    view === "row" ? (
      <div key={font.id} className="group/row flex flex-col">
        <FontRow
          font={font}
          previewText={previewText}
          isFavorite={favSet.has(font.id)}
          onToggleFavorite={onToggleFavorite}
          selection={selection}
          axisValues={axisValues}
        />
        {!isLastRow && (
          <Separator className="mx-4 transition-colors duration-fast ease-snap group-hover/row:bg-transparent aria-[orientation=horizontal]:w-auto" />
        )}
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
        lastRow={isLastRow}
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
          const isLastRow = row.index === rowCount - 1;
          return (
            <div
              key={rowKey(view, rowFonts[0]?.id ?? String(row.key))}
              data-index={row.index}
              // Virtual items are the only true siblings here (row view renders
              // one row each), so the "row below is hovered" rule lives on them.
              className="group/slot has-[+.group\/slot:hover]:[&_[data-slot=separator]]:bg-transparent"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
              }}
            >
              {view === "row" ? (
                <div>{rowFonts.map((f) => renderCell(f, isLastRow))}</div>
              ) : (
                // The row's last cell drops its right gridline, so only the
                // interior verticals show. :last-child also covers a final
                // partial row, where no cell reaches the last column.
                <div
                  className="grid [&>:last-child]:border-r-0"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {rowFonts.map((f) => renderCell(f, isLastRow))}
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
      {/* Column count is CSS-driven, so the interior verticals are added per
          breakpoint: every cell gets one, then each row's last cell drops it. */}
      <div className="grid @min-[1024px]:grid-cols-3 @min-[768px]:grid-cols-2 grid-cols-1 @min-[1024px]:[&>*:nth-child(2n)]:border-r @min-[768px]:[&>*:nth-child(2n)]:border-r-0 @min-[1024px]:[&>*:nth-child(3n)]:border-r-0 @min-[768px]:[&>*]:border-r">
        {keys.map((k) => (
          <SkeletonCard key={k} />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    // The right gridline comes from the container, which knows the breakpoint's
    // column count and can skip each row's trailing cell.
    <div className="flex h-72 flex-col gap-4 border-border border-b p-4">
      <div className="flex flex-col gap-1">
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex min-h-16 flex-1 flex-col gap-2.5 py-1">
        <div className="h-6 w-[85%] animate-pulse rounded bg-muted" />
        <div className="h-6 w-[70%] animate-pulse rounded bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-wrap gap-1">
        <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

function SkeletonLine() {
  return (
    <div className="flex flex-col">
      <div className="flex h-32 flex-col justify-center gap-4">
        <div className="px-4">
          <div className="h-4 w-40 max-w-[60%] animate-pulse rounded bg-muted" />
        </div>
        <div className="mx-4 h-9 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <Separator className="mx-4 aria-[orientation=horizontal]:w-auto" />
    </div>
  );
}
