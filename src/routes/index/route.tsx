import {
  MagnifyingGlassIcon,
  RowsIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActiveFilterChips } from "@/components/filter/active-filter-chips";
import { FilterRail } from "@/components/filter/filter-rail";
import { FilterSidebar } from "@/components/filter/filter-sidebar";
import {
  DEFAULT_FILTER_GROUP,
  type FilterGroupId,
} from "@/components/filter/groups";
import { Column, FilterLayout } from "@/components/filter-layout";
import { FontGrid, type ViewMode } from "@/components/font-grid";
import { PreviewBar } from "@/components/preview-dock";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilter } from "@/lib/filter/context";
import { withFacets } from "@/lib/fonts/facets";
import { useFavorites } from "@/lib/fonts/favorites";
import {
  activeFilterCount,
  applyFilters,
  buildFacetIndex,
  emptyFilter,
  type FilterSearch,
  type FilterState,
  filterToSearch,
  parseFilterSearch,
  queryRelevance,
  searchToFilter,
} from "@/lib/fonts/filter";
import { getAllFonts } from "@/lib/fonts/queries";
import { DEFAULT_SORT, type SortKey, sortFonts } from "@/lib/fonts/sort";
import { usePreview } from "@/lib/preview/context";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useListScrollRestore } from "@/lib/use-list-scroll-restore";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { SortControl } from "./-components/sort-control";

// How long the filter must stay unchanged before the catalog is re-filtered.
// Long enough to coalesce a burst of chip removals (and avoid a skeleton/empty
// flash between them), short enough to feel immediate on a single change.
const FILTER_DEBOUNCE_MS = 200;

export const Route = createFileRoute("/")({
  component: App,
  validateSearch: (raw): FilterSearch => parseFilterSearch(raw),
  loader: async () => ({ fonts: withFacets(await getAllFonts()) }),
});

function App() {
  const { fonts } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { text: previewText } = usePreview();
  const { favorites, toggle } = useFavorites();

  const { setFilter: setSharedFilter, listScrollY } = useFilter();
  const facetIndex = useMemo(() => buildFacetIndex(fonts), [fonts]);

  // The results list scrolls inside the Column's ScrollArea viewport, not the
  // window. The virtualizer and scroll restore both bind to this element.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Two-layer filter state so tapping a pill feels instant and stays decoupled
  // from the expensive re-filter of the whole catalog:
  //  - `filter` (pending) updates synchronously on every tap, driving the pills,
  //    rail, chips and active count so the UI responds immediately.
  //  - `debouncedFilter` trails it: the heavy applyFilters + grid re-render run
  //    only once the input settles, so a burst of changes (e.g. removing several
  //    chips in a row) coalesces into one recompute. During the settle window
  //    the previous results stay on screen, so the list never flashes a skeleton
  //    or a transient "no results" between two chips.
  //  - the URL is only rewritten once filtering settles (see the effect below),
  //    keeping it shareable without paying a navigation on every tap.
  const [filter, setFilter] = useState<FilterState>(() =>
    searchToFilter(search)
  );
  const debouncedFilter = useDebouncedValue(filter, FILTER_DEBOUNCE_MS);

  // Pull external URL changes (back/forward, a shared link) back into the
  // pending filter. Guarded by a serialized compare so our own URL writes —
  // which make `search` match `filter` — don't loop back in.
  // biome-ignore lint/correctness/useExhaustiveDependencies: compare against the live `filter` without making it a trigger; only `search` should drive this.
  useEffect(() => {
    const fromUrl = searchToFilter(search);
    if (
      JSON.stringify(filterToSearch(fromUrl)) !==
      JSON.stringify(filterToSearch(filter))
    ) {
      setFilter(fromUrl);
    }
  }, [search]);

  // Relative position (0-100%) per selected variable-axis tag, from the
  // sidebar sliders. Session-only UI state, not URL-synced: there's no
  // universal min/max across fonts to persist as a real filter value, so each
  // font maps this percent onto its own axis range for the live preview.
  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  const setAxisValue = (tag: string, pct: number) =>
    setAxisValues((s) => ({ ...s, [tag]: pct }));
  // Which filter group the sidebar panel shows. Session-only UI state.
  const [group, setGroup] = useState<FilterGroupId>(DEFAULT_FILTER_GROUP);
  // View mode is a personal-device preference, kept in localStorage rather than
  // the URL so a shared link never forces the recipient into your grid/row
  // choice. Sort stays in the URL — it can carry result meaning worth sharing.
  const [viewPref, setViewPref] = useLocalStorageState(
    "font-finder.view",
    "grid"
  );
  const view: ViewMode = viewPref === "row" ? "row" : "grid";
  const sort = (search.sort as SortKey) ?? DEFAULT_SORT;

  const results = useMemo(() => {
    const filtered = applyFilters(fonts, debouncedFilter);
    const sorted = sortFonts(filtered, sort);
    // With a search query, surface the best textual matches first (ignoring the
    // sort dropdown for ranking), then fall back to the chosen sort as the
    // tiebreaker. Stable sort keeps the sorted order within equal-relevance ties.
    if (!debouncedFilter.query.trim()) return sorted;
    return [...sorted].sort(
      (a, b) =>
        queryRelevance(b, debouncedFilter.query) -
        queryRelevance(a, debouncedFilter.query)
    );
  }, [fonts, debouncedFilter, sort]);

  // Write the settled filter to the URL once filtering catches up, so the URL
  // stays shareable without a navigation on every intermediate tap. Guarded so
  // it only fires when the URL's filter part actually differs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `search` is read to compare, not to trigger; the settled `debouncedFilter` is the trigger.
  useEffect(() => {
    const next = filterToSearch(debouncedFilter);
    const cur = filterToSearch(searchToFilter(search));
    if (JSON.stringify(next) === JSON.stringify(cur)) return;
    navigate({
      search: { ...next, sort: search.sort },
      replace: true,
    });
  }, [debouncedFilter, navigate]);

  // Mirror the pending filter into shared context so the detail page's sidebar
  // reflects what's selected on the list without waiting on the deferred pass.
  useEffect(() => {
    setSharedFilter(filter);
  }, [filter, setSharedFilter]);

  useListScrollRestore(scrollRef, listScrollY);

  // Sort writes the URL immediately — it's cheap and doesn't gate on the
  // deferred filter. It carries the current pending filter along so the URL
  // keeps a consistent shape.
  const setSort = (next: SortKey) => {
    navigate({
      search: {
        ...filterToSearch(filter),
        sort: next === DEFAULT_SORT ? undefined : next,
      },
      replace: true,
    });
  };

  const setView = (next: ViewMode) => setViewPref(next);
  // Clear every filter and the search query, keeping only display prefs.
  const reset = () => setFilter(emptyFilter);

  const activeCount = activeFilterCount(filter);
  // Reset clears the search query as well as the filters, so the control shows
  // whenever either is active. One neutral "Reset" label covers all cases (only
  // filters, only a search, or both) without a misleading "filter" wording.
  const hasQuery = filter.query.trim().length > 0;

  return (
    <FilterLayout
      rail={<FilterRail active={group} filter={filter} onSelect={setGroup} />}
      sidebar={
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={setFilter}
          group={group}
          axisValues={axisValues}
          onAxisValueChange={setAxisValue}
        />
      }
    >
      <Column
        scrollViewportRef={scrollRef}
        header={
          <>
            <div className="flex items-center gap-2">
              <SearchInput
                query={filter.query}
                onQueryChange={(query) => setFilter({ ...filter, query })}
              />
              {(activeCount > 0 || hasQuery) && (
                <Button
                  variant="ghost"
                  onClick={reset}
                  className="text-destructive"
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-muted-foreground text-sm">
                {results.length} fonts
              </span>
              <SortControl sort={sort} onChange={setSort} />

              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                <TabsList className="h-8">
                  <TabsTrigger value="grid" aria-label="Grid view">
                    Grid
                    <SquaresFourIcon className="size-4" />
                  </TabsTrigger>
                  <TabsTrigger value="row" aria-label="Row view">
                    Row
                    <RowsIcon className="size-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </>
        }
        footer={<PreviewBar />}
      >
        {results.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MagnifyingGlassIcon />
              </EmptyMedia>
              <EmptyTitle>No fonts found</EmptyTitle>
              <EmptyDescription>
                No fonts match your filters and search. Remove a condition
                below, or broaden them.
              </EmptyDescription>
            </EmptyHeader>
            <ActiveFilterChips filter={filter} onChange={setFilter} />
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
          </Empty>
        ) : (
          <>
            <ActiveFilterChips
              filter={filter}
              onChange={setFilter}
              align="left"
            />
            <FontGrid
              fonts={results}
              previewText={previewText}
              favorites={favorites}
              onToggleFavorite={toggle}
              view={view}
              selection={debouncedFilter}
              axisValues={axisValues}
              scrollRef={scrollRef}
            />
          </>
        )}
      </Column>
    </FilterLayout>
  );
}

// Local draft state + IME composition guard so typing 注音/拼音 assembles a
// character before it reaches the filter. Committing every keystroke to the URL
// interrupts composition; we only commit once the IME finishes (or on plain
// input for non-IME text).
function SearchInput({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const [draft, setDraft] = useState(query);
  const composing = useRef(false);

  // Keep the draft in sync when the query changes from outside (e.g. reset).
  useEffect(() => {
    setDraft(query);
  }, [query]);

  const commit = (value: string) => {
    setDraft(value);
    if (!composing.current) onQueryChange(value);
  };

  return (
    <div className="relative w-72">
      <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(e) => {
          composing.current = false;
          onQueryChange(e.currentTarget.value);
        }}
        placeholder="Search family or designer"
        aria-label="Search fonts by family or designer"
        className="h-9 pl-8"
      />
    </div>
  );
}
