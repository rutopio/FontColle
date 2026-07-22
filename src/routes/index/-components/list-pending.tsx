import { Column, FilterLayout } from "@/components/filter-layout";
import { FontCard } from "@/components/font-card";
import { SkeletonGrid } from "@/components/font-grid";
import { FontRow } from "@/components/font-row";
import { PreviewBar } from "@/components/preview-dock";
import { emptyFilter } from "@/lib/fonts/filter";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";

// Placeholder for the list header while the catalog loads. The wrapper classes
// mirror Catalog's real header exactly (search row, then the count/sort/view
// row), because the Column header is flex-wrap: on mobile the real header wraps
// to two rows, so a one-row skeleton would let the header grow the moment the
// catalog resolved and push the whole list down. Each block stands in for the
// control at that position, at its real height (h-9 search, h-8 sort and tabs).
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

// Shown while the catalog loader runs (a slow catalog.json fetch). Reuses the app shell,
// rail + empty sidebar + Column header/footer, with a skeleton grid body, so a
// slow load reads as the page filling in rather than a blank or spinner. The
// controls are inert placeholders (no data yet); the real App swaps in on load.
export function ListPending() {
  return (
    <FilterLayout sidebar={<div className="size-full" />}>
      <Column header={HEADER_SKELETON} footer={<PreviewBar />}>
        <SkeletonGrid view="grid" />
      </Column>
    </FilterLayout>
  );
}

// Pending state for the DEFAULT `/` view: renders the loader's first-page slice
// as real, non-virtualized FontCards (real <Link> /instances/ anchors), so a
// crawler or non-JS fetch of `/` sees ~24 actual fonts in the SSR HTML instead
// of an empty shell. Below the real cards sits a skeleton grid, so the panel
// reads as "filling in" until the full catalog resolves and Catalog takes over.
//
// The wrapper classes mirror the virtualized grid's row container (grid gap-4
// pb-4, md:2 lg:3 columns) so nothing jumps on the swap. Favorites hydrate to []
// (useFavorites is SSR-safe), preview text is "" (falls back to each font's
// specimen), and the selection is the empty filter, the exact props Catalog
// passes on a default first render, so server and first-client trees agree.
export function FirstPagePending({ firstPage }: { firstPage: FontRecord[] }) {
  const { text: previewText } = usePreview();
  // Column count must match FontGrid exactly or the layout reflows the moment
  // Catalog takes over. FontGrid measures its CONTAINER (columnsFor), not the
  // viewport, because the filter panel narrows the list well below the viewport
  // breakpoint — at 1440px the list is ~1000px and wants 2 columns, at 1920px
  // it is ~1480px and wants 3.
  //
  // Hence container queries rather than JS: measuring in an effect leaves the
  // first paint showing a guessed count, and any hardcoded guess is wrong at
  // some width (2 reflowed to 3 at 1920px, 3 reflowed to 2 at 1440px). CSS
  // resolves against the real container on the first paint, with no window
  // where the two grids disagree. The breakpoints mirror columnsFor's.

  // No loader slice (build without catalog-first.json, or a fetch failure):
  // fall back to the plain skeleton, unchanged from before this feature.
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

// Stable, module-level props for the first-page cards: an empty selection (no
// active filter), no axis sliders, and a no-op favorite toggle (favorites are
// still hydrating). Module-level so they're referentially stable and FontCard's
// memo bails out cleanly.
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
