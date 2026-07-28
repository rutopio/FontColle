import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { FilterRail } from "@/components/filter/filter-rail";
import { DEFAULT_FILTER_GROUP } from "@/components/filter/groups";
import { PresetToggle } from "@/components/filter/preset-toggle";
import { Column, FilterLayout } from "@/components/filter-layout";
import { FontCard } from "@/components/font-card";
import { SkeletonGrid } from "@/components/font-grid";
import { FontRow } from "@/components/font-row";
import { PreviewBar } from "@/components/preview-dock";
import { RAIL_HEADER_CELL } from "@/components/rail-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { emptyFilter } from "@/lib/fonts/filter";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";

// The rail is inert while pending, so its handler is never reached.
const NOOP_GROUP = () => {};
// Fixed-length placeholder runs, keyed by name rather than index.
const CARD_SLOTS = ["sans", "serif", "mono", "display", "script", "slab"];
const PILL_SECTIONS = [
  { id: "style", pills: ["a", "b", "c", "d", "e", "f"] },
  { id: "mood", pills: ["a", "b", "c", "d"] },
];

// Mirrors Catalog's real header block for block, because the header is
// flex-wrap: on mobile the real one wraps to two rows, so a skeleton of the
// wrong shape would resize the header the moment the catalog resolved and push
// the whole list down. Every height here tracks the real control's.
const HEADER_SKELETON = (
  <>
    <div className="flex min-w-0 flex-1 items-center gap-2 max-md:w-full">
      {/* The search field, capped to the filter panel's width like the real
          one. */}
      <div className="h-9 min-w-0 flex-1 animate-pulse rounded-lg bg-muted md:max-w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-1rem-1.0625rem)]" />
      {/* Sort, which sits beside the field on desktop and drops to the second
          row on a phone — the same split the real control makes. w-44 is the
          width SortControl settles at from its trigger's min-w-36 plus the
          direction button and the divider between them. */}
      <div className="hidden h-9 w-44 animate-pulse rounded-lg bg-muted md:block" />
    </div>

    <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:shrink-0 md:gap-3">
      {/* The real count span is flex-1, so it owns the slack and pushes what
          follows to the right edge; the pulse block inside keeps a text-sized
          bar rather than stretching across that whole slack. */}
      <div className="flex-1">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      {/* Sort's phone position; see the desktop twin above. */}
      <div className="h-9 w-44 animate-pulse rounded-lg bg-muted md:hidden" />
      {/* The view tabs. */}
      <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
      {/* The real controls, like the rail's: these three look the same on every
          render and two of them work already — the theme switches and About
          opens while the catalog is still arriving. Favorite is live too; it
          reads the URL, which is there from the first paint. */}
      <div className="hidden items-center gap-1 md:flex">
        <div className={RAIL_HEADER_CELL}>
          <ThemeToggle variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <AboutLink variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <FavoriteToggle variant="header" />
        </div>
      </div>
    </div>
  </>
);

// The real rail, not a skeleton: its buttons are the same nine icons on every
// render, so there is nothing to wait for and a shimmer there would only make
// the sidebar flicker into the same shape it already had. `inert` makes the
// whole run unclickable and drops it out of the tab order until the catalog
// arrives; emptyFilter gives every group a zero count, so no badge shows.
function PendingRail() {
  return (
    <div inert className="flex flex-col gap-1 opacity-60">
      <FilterRail
        active={DEFAULT_FILTER_GROUP}
        filter={emptyFilter}
        onSelect={NOOP_GROUP}
      />
      <Separator className="my-1" />
      <PresetToggle active={false} onSelect={NOOP_GROUP} />
    </div>
  );
}

// The filter panel, shimmering like the header above it. Only the shapes: a
// group heading, the card grid the Style group opens with, then two runs of
// pills. Enough to hold the panel's silhouette so the real sections don't
// arrive into an empty box.
const SIDEBAR_SKELETON = (
  <div className="flex w-full flex-col gap-8 p-4">
    <div className="flex flex-col gap-2">
      {/* The group heading: an icon over its label, at the h2's own size. */}
      <div className="flex items-center gap-1.5">
        <div className="size-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
      {/* CategoryCards' 3-up grid of square tiles. */}
      <div className="grid grid-cols-3 gap-1.5">
        {CARD_SLOTS.map((slot) => (
          <div
            key={`card:${slot}`}
            className="aspect-square animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    </div>

    {/* Two pill sections, the shape most of the panel's groups take. */}
    {PILL_SECTIONS.map((section) => (
      <div key={`section:${section.id}`} className="flex flex-col gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-1.5">
          {section.pills.map((pill) => (
            <div
              key={`pill:${section.id}:${pill}`}
              className="h-8 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Everything that does not depend on the catalog renders for real — the rail's
// icons, Theme, About, Favorite. Only what the catalog fills in (the search
// field, sort, the count, the filter sections) shimmers until it arrives.
export function ListPending() {
  return (
    <FilterLayout
      rail={<PendingRail />}
      sidebar={SIDEBAR_SKELETON}
      header={HEADER_SKELETON}
    >
      <Column footer={<PreviewBar />}>
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
    <FilterLayout
      rail={<PendingRail />}
      sidebar={SIDEBAR_SKELETON}
      header={HEADER_SKELETON}
    >
      <Column footer={<PreviewBar />}>
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
