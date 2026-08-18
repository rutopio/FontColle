import {
  BracketsSquareIcon,
  DiscoBallIcon,
  ShapesIcon,
} from "@phosphor-icons/react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { FilterRail } from "@/components/filter/filter-rail";
import { DEFAULT_FILTER_GROUP } from "@/components/filter/groups";
import { PresetToggle } from "@/components/filter/preset-toggle";
import { PreviewToggle } from "@/components/filter/preview-toggle";
import { Column, FilterLayout } from "@/components/filter-layout";
import { FontCard } from "@/components/font-card";
import { SkeletonGrid } from "@/components/font-grid";
import { FontRow } from "@/components/font-row";
import { GithubLink } from "@/components/github-link";
import { PreviewBar } from "@/components/preview-dock";
import { RAIL_HEADER_CELL } from "@/components/rail-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { emptyFilter } from "@/lib/fonts/filter";
import { DEFAULT_SORT } from "@/lib/fonts/sort";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { cn } from "@/lib/utils";
import { SearchInput, type SearchSuggestion } from "./search-input";
import { SortControl } from "./sort-control";
import { ViewTabs } from "./view-tabs";

const NOOP_GROUP = () => {};
const NOOP_TOGGLE = () => {};

// Mirrors the live card order in filter-sidebar.tsx.
const CATEGORY_CARDS = [
  "sans",
  "serif",
  "display",
  "script",
  "slab",
  "graphics",
];
const SPACING_PILLS = ["proportional", "mono"];
const STYLE_SUBGROUPS = [
  { id: "sans-serif", count: 7 },
  { id: "serif", count: 7 },
  { id: "slab", count: 3 },
  { id: "script", count: 4 },
].map((sub) => ({
  ...sub,
  pillKeys: Array.from({ length: sub.count }, (_, i) => `pill:${sub.id}:${i}`),
}));

// Inert real-sized controls so the header doesn't shift when the catalog loads.
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
      <div className="hidden lg:block">
        <SortControl sort={DEFAULT_SORT} onChange={PENDING_SORT} />
      </div>
    </div>

    <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:shrink-0 md:gap-3">
      <div className="flex-1">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      {/* `contents` keeps flex layout; children dim themselves (opacity ignores contents). */}
      <div inert className="contents">
        <div className="opacity-60 md:hidden">
          <SortControl sort={DEFAULT_SORT} onChange={PENDING_SORT} />
        </div>
        <div className="pending-grid-only opacity-60">
          <ViewTabs view="grid" onChange={PENDING_SORT} />
        </div>
        <div className="pending-row-only opacity-60">
          <ViewTabs view="row" onChange={PENDING_SORT} />
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <Separator aria-hidden orientation="vertical" className="mx-2 h-5" />
        <div className={RAIL_HEADER_CELL}>
          <ThemeToggle variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <AboutLink variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <GithubLink variant="header" />
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
      {/* Mirrors the real rail's layout so nothing shifts when it swaps in. */}
      <PreviewToggle active onToggle={NOOP_TOGGLE} />
      <Separator className="my-1" />
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
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
          <ShapesIcon className="size-4" />
          Category
        </h2>
        <div
          className="invisible flex items-center gap-1 px-2 py-1 font-mono text-xs"
          aria-hidden="true"
        >
          Reset
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORY_CARDS.map((card) => (
          <div
            key={`card:${card}`}
            className="h-22 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-1.5 font-medium text-primary text-sm uppercase">
          <BracketsSquareIcon className="size-4 shrink-0" />
          <span className="truncate">Spacing</span>
        </h2>
        <div
          className="invisible flex items-center gap-1 px-2 py-1 font-mono text-xs"
          aria-hidden="true"
        >
          Reset
        </div>
      </div>
      {/* Mirrors SegmentedPills: the same bordered row, so the 1px border adds
          the same 2px as it does once the real pills render. */}
      <div className="flex rounded-md border">
        {SPACING_PILLS.map((pill, i) => (
          <div
            key={`spacing:${pill}`}
            className={cn(
              "min-h-9 flex-1 animate-pulse bg-muted md:min-h-8",
              i > 0 && "border-l",
              i === 0 ? "rounded-l-md" : "rounded-r-md"
            )}
          />
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-1.5 font-medium text-primary text-sm uppercase">
          <DiscoBallIcon className="size-4 shrink-0" />
          <span className="truncate">Style</span>
        </h2>
        <div
          className="invisible flex items-center gap-1 px-2 py-1 font-mono text-xs"
          aria-hidden="true"
        >
          Reset
        </div>
      </div>
      <div className="flex flex-col gap-8">
        {STYLE_SUBGROUPS.map((sub) => (
          <div key={`sub:${sub.id}`} className="flex flex-col gap-2">
            <h3 className="font-medium text-muted-foreground text-xs uppercase">
              {sub.id}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {sub.pillKeys.map((key) => (
                <div
                  key={key}
                  className="h-8 animate-pulse rounded-md bg-muted"
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
        {/* SSR picks grid vs row via data-view on <html>. */}
        <div className="pending-grid-only flex-1">
          <SkeletonGrid view="grid" />
        </div>
        <div className="pending-row-only flex-1">
          <SkeletonGrid view="row" />
        </div>
      </Column>
    </FilterLayout>
  );
}

export function FirstPagePending({ firstPage }: { firstPage: FontRecord[] }) {
  const {
    text: previewText,
    size: previewSize,
    leading: previewLeading,
  } = usePreview();

  if (firstPage.length === 0) return <ListPending />;

  return (
    <FilterLayout
      rail={<PendingRail />}
      sidebar={SIDEBAR_SKELETON}
      header={HEADER_SKELETON}
    >
      <Column footer={<PreviewBar />}>
        <div className="pending-grid-only @container flex-1">
          <div className="pending-cols grid [&>*]:border-r-0">
            {firstPage.map((font) => (
              <FontCard
                key={font.id}
                font={font}
                previewText={previewText}
                previewSize={previewSize}
                previewLeading={previewLeading}
                isFavorite={false}
                onToggleFavorite={NOOP}
                selection={FIRST_PAGE_SELECTION}
                axisValues={EMPTY_AXES}
                staticActions
              />
            ))}
          </div>
          <SkeletonGrid view="grid" />
        </div>
        <div className="pending-row-only flex-1">
          {firstPage.map((font) => (
            <div key={font.id} className="flex flex-col">
              <FontRow
                font={font}
                previewText={previewText}
                previewSize={previewSize}
                previewLeading={previewLeading}
                isFavorite={false}
                onToggleFavorite={NOOP}
                selection={FIRST_PAGE_SELECTION}
                axisValues={EMPTY_AXES}
                staticActions
              />
              <Separator className="mx-4 aria-[orientation=horizontal]:w-auto" />
            </div>
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
