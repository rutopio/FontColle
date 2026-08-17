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
import { cardHeight, rowHeight } from "@/lib/preview/size";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

export type ViewMode = "grid" | "row";

interface Props {
  fonts: FontRecord[];
  previewText: string;
  previewSize: number;
  previewLeading: number;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  view: ViewMode;
  maxCols?: number;
  selection: FilterSelection;
  axisValues: Record<string, number>;
  scrollRef: RefObject<HTMLDivElement | null>;
}

/** Widest grid the layout offers. */
export const MAX_COLS = 4;
/** Used when nothing is stored — 4 is opt-in, not the out-of-the-box density. */
export const DEFAULT_COLS = 3;
export const COL_CHOICES = [1, 2, 3, 4] as const;
/** Skeleton rows to show. Cards emitted = MAX_COLS * this; CSS trims the rest. */
const SKELETON_ROWS = 3;

export function clampCols(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COLS;
  return Math.min(MAX_COLS, Math.max(1, Math.trunc(value)));
}

/**
 * `maxCols` is the user's ceiling, not a target: the width still decides how
 * many columns actually fit, so a narrow window stays 1–2 columns even when the
 * preference says 4. Row view ignores both — it is a different cell component,
 * not a one-column grid.
 *
 * `width` is the LIST CONTAINER, not the viewport. The shell caps at 120rem and
 * then spends part of it on the rail and filter sidebar, so this measures at
 * most ~1414px however wide the screen is — a threshold above that can never
 * fire. Hence 4 columns at 1280px (~320px per card, about what 3 columns get on
 * a 1440px screen), not at a viewport-sized 1536px.
 */
export function columnsFor(
  width: number,
  view: ViewMode,
  maxCols: number = DEFAULT_COLS
): number {
  if (view === "row") return 1;
  const fits = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  return Math.min(fits, clampCols(maxCols));
}

const rowKey = (view: ViewMode, firstFontId: string) =>
  `${view}-${firstFontId}`;

export function FontGrid({
  fonts,
  previewText,
  previewSize,
  previewLeading,
  favorites,
  onToggleFavorite,
  view,
  maxCols = DEFAULT_COLS,
  selection,
  axisValues,
  scrollRef,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const [cols, setCols] = useState(view === "row" ? 1 : clampCols(maxCols));
  const [virtualizerReady, setVirtualizerReady] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      if (!listRef.current) return;
      setCols(columnsFor(listRef.current.offsetWidth, view, maxCols));
    };
    measure();
    setVirtualizerReady(true);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, maxCols]);

  const rowCount = Math.ceil(fonts.length / cols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () =>
      view === "row" ? rowHeight(previewSize) : cardHeight(previewSize),
    overscan: 4,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: cols/view/previewSize/previewLeading are the re-measure triggers, not read in the body, a change to any must re-run measurement.
  useEffect(() => {
    virtualizer.measure();
  }, [cols, view, previewSize, previewLeading, virtualizer]);

  const renderCell = (font: FontRecord, isLastRow = false) =>
    view === "row" ? (
      <div key={font.id} className="group/row flex flex-col">
        <FontRow
          font={font}
          previewText={previewText}
          previewSize={previewSize}
          previewLeading={previewLeading}
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
        previewSize={previewSize}
        previewLeading={previewLeading}
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
          const isFirstRow = row.index === 0;
          return (
            <div
              key={rowKey(view, rowFonts[0]?.id ?? String(row.key))}
              data-index={row.index}
              // Cards/rows only set a *minimum* height — wrapped preview text
              // can make a row taller, so measure it instead of trusting
              // estimateSize.
              ref={virtualizer.measureElement}
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
                <div
                  className={cn(
                    "grid [&>:last-child]:border-r-0",
                    isFirstRow &&
                      "[&>:first-child]:rounded-tl-lg [&>:last-child]:rounded-tr-lg",
                    isLastRow &&
                      "[&>:first-child]:rounded-bl-lg [&>:last-child]:rounded-br-lg"
                  )}
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

/**
 * Column count comes from the `pending-cols` utility (data-cols on <html>), not
 * from a prop: this also renders pre-hydration in the SSR pending list, where
 * React cannot read the stored preference. Driving both cases from the same CSS
 * keeps the placeholder's columns identical to the grid that replaces it.
 *
 * The card *count* has to follow the same rule. It is always MAX_COLS rows'
 * worth, and `pending-cols` hides the surplus so every density ends on a whole
 * row: emitting a fixed 9 instead left 4-column layouts ragged (4+4+1) and
 * changed the card count on hydration, which is the jump this avoids.
 */
export function SkeletonGrid({ view }: { view: ViewMode }) {
  const count = view === "row" ? 8 : MAX_COLS * SKELETON_ROWS;
  const keys = Array.from({ length: count }, (_, i) => `skeleton-${i}`);
  return view === "row" ? (
    <div className="flex flex-col">
      {keys.map((k) => (
        <SkeletonLine key={k} />
      ))}
    </div>
  ) : (
    <div className="@container">
      <div className="pending-cols pending-rows grid">
        {keys.map((k) => (
          <SkeletonCard key={k} />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
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
