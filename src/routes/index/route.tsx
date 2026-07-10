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
import { useListScrollRestore } from "@/lib/use-list-scroll-restore";
import { SortControl } from "./-components/sort-control";

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
  const filter = useMemo(() => searchToFilter(search), [search]);
  // Relative position (0-100%) per selected variable-axis tag, from the
  // sidebar sliders. Session-only UI state, not URL-synced: there's no
  // universal min/max across fonts to persist as a real filter value, so each
  // font maps this percent onto its own axis range for the live preview.
  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  const setAxisValue = (tag: string, pct: number) =>
    setAxisValues((s) => ({ ...s, [tag]: pct }));
  // Which filter group the sidebar panel shows. Session-only UI state.
  const [group, setGroup] = useState<FilterGroupId>(DEFAULT_FILTER_GROUP);
  const view: ViewMode = search.view === "row" ? "row" : "grid";
  const sort = (search.sort as SortKey) ?? DEFAULT_SORT;

  const results = useMemo(() => {
    const filtered = applyFilters(fonts, filter);
    const sorted = sortFonts(filtered, sort);
    // With a search query, surface the best textual matches first (ignoring the
    // sort dropdown for ranking), then fall back to the chosen sort as the
    // tiebreaker. Stable sort keeps the sorted order within equal-relevance ties.
    if (!filter.query.trim()) return sorted;
    return [...sorted].sort(
      (a, b) =>
        queryRelevance(b, filter.query) - queryRelevance(a, filter.query)
    );
  }, [fonts, filter, sort]);

  // Mirror the URL-derived filter into shared context so the detail page's
  // sidebar can reflect what's selected on the list.
  useEffect(() => {
    setSharedFilter(filter);
  }, [filter, setSharedFilter]);

  useListScrollRestore(listScrollY);

  // Every nav writes the same search shape: the filter as params, plus the two
  // display prefs (view, sort) preserved unless the caller overrides them. One
  // helper keeps the three setters from drifting out of sync.
  const setSearch = (
    filterPart: FilterState,
    prefs?: Partial<Pick<FilterSearch, "view" | "sort">>
  ) => {
    navigate({
      search: {
        ...filterToSearch(filterPart),
        view: prefs && "view" in prefs ? prefs.view : search.view,
        sort: prefs && "sort" in prefs ? prefs.sort : search.sort,
      },
      replace: true,
    });
  };

  const setFilter = (next: FilterState) => setSearch(next);
  const setView = (next: ViewMode) =>
    setSearch(filter, { view: next === "row" ? "row" : undefined });
  const setSort = (next: SortKey) =>
    setSearch(filter, { sort: next === DEFAULT_SORT ? undefined : next });
  // Clear every filter and the search query, keeping only display prefs.
  const reset = () => setSearch(emptyFilter);

  const activeCount = activeFilterCount(filter);

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
        header={
          <>
            <SearchInput
              query={filter.query}
              onQueryChange={(query) => setFilter({ ...filter, query })}
            />

            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <span>{results.length} fonts</span>
              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={reset}
                  className="text-destructive"
                >
                  Clear {activeCount} filters
                </Button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
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
              selection={filter}
              axisValues={axisValues}
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
        placeholder="Search family or creator"
        aria-label="Search fonts by family or creator"
        className="h-9 pl-8"
      />
    </div>
  );
}
