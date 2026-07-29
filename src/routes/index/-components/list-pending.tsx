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
import { DEFAULT_SORT } from "@/lib/fonts/sort";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { SearchInput, type SearchSuggestion } from "./search-input";
import { SortControl } from "./sort-control";
import { ViewTabs } from "./view-tabs";

const NOOP_GROUP = () => {};

const CATEGORY_CARDS = [
  "sans",
  "serif",
  "mono",
  "display",
  "script",
  "slab",
  "emoji",
  "graphics",
];
const STYLE_SUBGROUPS = [
  { id: "sans-serif", pills: 7 },
  { id: "serif", pills: 7 },
  { id: "slab", pills: 3 },
  { id: "script", pills: 4 },
];

/* The header's controls all render at their real size and in their real state
   while the catalog loads, so nothing moves when it arrives. Only the result
   count is a skeleton — it is the one thing that genuinely has no value yet.
   The controls are inert rather than individually disabled: SearchInput and
   SortControl take no `disabled` prop, and adding one to both just to gray them
   out here would be a wider change than the placeholder is worth. Same trick as
   PendingRail below. */
const PENDING_SORT = () => {};
const EMPTY_SUGGESTIONS: SearchSuggestion[] = [];

const HEADER_SKELETON = (
  <>
    <div
      inert
      className="flex min-w-0 flex-1 items-center gap-2 opacity-60 max-md:w-full"
    >
      <SearchInput
        query=""
        onQueryChange={PENDING_SORT}
        suggestions={EMPTY_SUGGESTIONS}
        onPick={PENDING_SORT}
      />
      <div className="hidden md:block">
        <SortControl sort={DEFAULT_SORT} onChange={PENDING_SORT} />
      </div>
    </div>

    <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:shrink-0 md:gap-3">
      <div className="flex-1">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      {/* `contents` so these two stay direct flex children of the row above,
          matching the real header's layout exactly. Opacity has no effect on a
          `contents` box, so each child dims itself. */}
      <div inert className="contents">
        <div className="opacity-60 md:hidden">
          <SortControl sort={DEFAULT_SORT} onChange={PENDING_SORT} />
        </div>
        <div className="opacity-60">
          <ViewTabs view="grid" onChange={PENDING_SORT} />
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
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

function PendingRail() {
  return (
    <div inert className="flex flex-col gap-1 opacity-60">
      <FilterRail
        active={DEFAULT_FILTER_GROUP}
        filter={emptyFilter}
        onSelect={NOOP_GROUP}
        indicatorId="pending-rail-indicator"
      />
      <Separator className="my-1" />
      <PresetToggle
        active={false}
        onSelect={NOOP_GROUP}
        indicatorId="pending-rail-indicator"
      />
    </div>
  );
}

const SIDEBAR_SKELETON = (
  <div className="flex w-full flex-col gap-12 p-4">
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="size-4 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {CATEGORY_CARDS.map((card) => (
          <div
            key={`card:${card}`}
            className="aspect-square animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <div className="size-4 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-14 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-8">
        {STYLE_SUBGROUPS.map((sub) => (
          <div key={`sub:${sub.id}`} className="flex flex-col gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-1.5">
              {Array.from({ length: sub.pills }, (_, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static placeholder grid, no reordering.
                  key={`pill:${sub.id}:${i}`}
                  className="h-8 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

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

export function FirstPagePending({ firstPage }: { firstPage: FontRecord[] }) {
  const { text: previewText } = usePreview();

  if (firstPage.length === 0) return <ListPending />;

  return (
    <FilterLayout
      rail={<PendingRail />}
      sidebar={SIDEBAR_SKELETON}
      header={HEADER_SKELETON}
    >
      <Column footer={<PreviewBar />}>
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
