import { Column, FilterLayout } from "@/components/filter-layout";
import { FontCard } from "@/components/font-card";
import { SkeletonGrid } from "@/components/font-grid";
import { FontRow } from "@/components/font-row";
import { PreviewBar } from "@/components/preview-dock";
import { emptyFilter } from "@/lib/fonts/filter";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";

// The wrapper classes mirror Catalog's real header exactly, because the Column
// header is flex-wrap: on mobile the real one wraps to two rows, so a one-row
// skeleton would grow the header the moment the catalog resolved and push the
// whole list down.
const HEADER_SKELETON = (
  <>
    <div className="flex items-center gap-2 max-md:w-full">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-muted max-md:w-full max-md:min-w-0 max-md:flex-1 xl:w-96" />
    </div>
    <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:gap-3">
      {/* The real count span is flex-1, so it owns the slack and pushes sort +
          tabs to the right edge; the pulse block inside keeps a text-sized bar
          rather than stretching across that whole slack. */}
      <div className="flex-1">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
    </div>
  </>
);

// The controls are inert placeholders until the real App swaps in.
export function ListPending() {
  return (
    <FilterLayout sidebar={<div className="size-full" />}>
      <Column header={HEADER_SKELETON} footer={<PreviewBar />}>
        <SkeletonGrid view="grid" />
      </Column>
    </FilterLayout>
  );
}

// Real, non-virtualized FontCards, so a crawler or non-JS fetch of `/` sees
// ~24 actual fonts in the SSR HTML instead of an empty shell.
//
// The wrapper classes mirror the virtualized grid's row container so nothing
// jumps on the swap, and the props below are exactly what Catalog passes on a
// default first render, so the server and first-client trees agree.
export function FirstPagePending({ firstPage }: { firstPage: FontRecord[] }) {
  const { text: previewText } = usePreview();
  // The column count must match FontGrid exactly or the layout reflows when
  // Catalog takes over, and FontGrid measures its CONTAINER, not the viewport.
  // Container queries rather than JS: measuring in an effect would leave the
  // first paint showing a guess. Breakpoints mirror columnsFor's.

  if (firstPage.length === 0) return <ListPending />;

  return (
    <FilterLayout sidebar={<div className="size-full" />}>
      <Column header={HEADER_SKELETON} footer={<PreviewBar />}>
        {/* Both layouts are rendered; CSS shows the one matching data-view, so
            the SSR'd list already matches the visitor's saved preference. See
            pending-grid-only / pending-row-only in styles.css. */}
        <div className="pending-grid-only @container flex-1">
          <div className="grid @min-[1024px]:grid-cols-3 @min-[768px]:grid-cols-2 grid-cols-1 gap-4 pb-4">
            {firstPage.map((font) => (
              <FontCard
                key={font.id}
                font={font}
                previewText={previewText}
                isFavorite={false}
                onToggleFavorite={NOOP}
                selection={FIRST_PAGE_SELECTION}
                axisValues={EMPTY_AXES}
              />
            ))}
          </div>
          <SkeletonGrid view="grid" />
        </div>
        <div className="pending-row-only flex-1">
          {firstPage.map((font) => (
            <FontRow
              key={font.id}
              font={font}
              previewText={previewText}
              isFavorite={false}
              onToggleFavorite={NOOP}
              selection={FIRST_PAGE_SELECTION}
              axisValues={EMPTY_AXES}
            />
          ))}
          <SkeletonGrid view="row" />
        </div>
      </Column>
    </FilterLayout>
  );
}

// Module-level so they stay referentially stable and FontCard's memo bails out.
// The favorite toggle is a no-op: favorites are still hydrating.
const NOOP = () => {};
const EMPTY_AXES: Record<string, number> = {};
const FIRST_PAGE_SELECTION = {
  categories: emptyFilter.categories,
  tags: emptyFilter.tags,
  color: emptyFilter.color,
  axes: emptyFilter.axes,
  weights: emptyFilter.weights,
  widths: emptyFilter.widths,
  italic: emptyFilter.italic,
};
