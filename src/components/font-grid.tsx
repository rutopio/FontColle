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

export type ViewMode = "grid" | "row";

interface Props {
  fonts: FontRecord[];
  previewText: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  view: ViewMode;
  // Active filter slice, forwarded to each card/row to drive the live preview
  // and highlight the matching trait badges.
  selection: FilterSelection;
  // Session slider positions (0-100%) per selected variable axis.
  axisValues: Record<string, number>;
  // The scroll container (the Column's ScrollArea viewport) the virtualizer
  // scrolls within. The list lives inside it, so measurement and scrolling are
  // element-based, not window-based.
  scrollRef: RefObject<HTMLDivElement | null>;
}

// Grid column count matches the CSS breakpoints (md:2, lg:3). Row mode is always
// a single column. Measured from the container width (not the viewport), so the
// skeleton can reuse it to match the real grid even when the sidebar narrows
// the panel below a viewport breakpoint.
export function columnsFor(width: number, view: ViewMode): number {
  if (view === "row") return 1;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

// Card/line heights, shared with the loading skeleton so its placeholders match
// the real cells.
export const CARD_H = 288; // grid card height (h-72)
export const LINE_H = 112; // row-mode line height (h-28)

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
  // Derive a Set from the favorites array once per change, so each cell reads a
  // stable `isFavorite` primitive (favSet.has) instead of every cell scanning
  // the array with `.includes()`. Toggling one favorite then only flips that
  // cell's boolean prop; the memoized twins bail out on the rest.
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const [cols, setCols] = useState(view === "row" ? 1 : 3);
  // SSR renders a fixed first batch so crawlers/no-JS see content; after mount
  // the element virtualizer takes over.
  const [mounted, setMounted] = useState(false);

  // Card entrance animation only fires right after the result set changes
  // (filter/search), not on every scroll-mount. We open a short window when
  // `fonts` changes and apply the animation class only during it.
  const [animating, setAnimating] = useState(false);
  // Timestamp of the first render, not a boolean. A single `firstRun` flag is
  // not enough: the list feeds FontGrid from a useDeferredValue copy of the
  // filter, so the initial load delivers `fonts` twice in quick succession (the
  // urgent pass, then the deferred one). The second pass is a new array
  // identity, the effect read it as a filter change, and every visible card
  // played the entrance animation ~1.7s into the load — the whole grid
  // flashing once the catalog resolved. Changes within this settle window are
  // the initial fill; a real filter/search change always lands later, on user
  // input.
  const mountedAt = useRef(0);
  if (mountedAt.current === 0) mountedAt.current = Date.now();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `fonts`/`view` are the triggers, not read in the body, the effect fires on result-set or layout change to open the entrance-animation window.
  useEffect(() => {
    if (Date.now() - mountedAt.current < 500) return;
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 260);
    return () => clearTimeout(t);
  }, [fonts, view]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!listRef.current) return;
      setCols(columnsFor(listRef.current.offsetWidth, view));
    };
    measure();
    setMounted(true);
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
      <FontRow
        key={font.id}
        font={font}
        previewText={previewText}
        isFavorite={favSet.has(font.id)}
        onToggleFavorite={onToggleFavorite}
        selection={selection}
        axisValues={axisValues}
      />
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

  if (!mounted) {
    // SSR / first paint, before the virtualizer measures. Render a clean grid
    // of skeleton placeholders (not real cards) so the first frame is regular
    // instead of showing half-streamed cards jumping around. The virtualizer
    // takes over with real cards once mounted.
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
              // `view` is part of the key so a grid<->row switch remounts the
              // row. Without it the key is identical across the switch, React
              // reuses the DOM node, and a CSS animation on a reused element
              // never restarts — the entrance would silently no-op.
              key={`${view}-${rowFonts[0]?.id ?? row.key}`}
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

// A grid/list of skeleton placeholders, matching the real layout. Shared by the
// pre-mount frame here and the list route's pendingComponent (shown while the
// catalog loader runs), so a slow load looks the same as the first paint.
export function SkeletonGrid({ view }: { view: ViewMode }) {
  const count = view === "row" ? 8 : 9;
  // Stable keys for the fixed, never-reordered placeholder set.
  const keys = Array.from({ length: count }, (_, i) => `skeleton-${i}`);
  return view === "row" ? (
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
