import {
  MagnifyingGlassIcon,
  RowsIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilter } from "@/lib/filter/context";
import { withFacets } from "@/lib/fonts/facets";
import { useFavorites } from "@/lib/fonts/favorites";
import {
  applyFilters,
  buildFacetIndex,
  type FilterSearch,
  type FilterState,
  filterToSearch,
  parseFilterSearch,
  queryRelevance,
  searchToFilter,
} from "@/lib/fonts/filter";
import { getAllFonts } from "@/lib/fonts/queries";
import {
  DEFAULT_SORT,
  isDirectionless,
  SORT_GROUPS,
  type SortKey,
  sortFonts,
  sortGroupOf,
} from "@/lib/fonts/sort";
import { usePreview } from "@/lib/preview/context";

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

  // Remember the scroll position while browsing the list.
  useEffect(() => {
    const onScroll = () => {
      listScrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [listScrollY]);

  // Restore the list scroll when returning from a detail page. Two obstacles:
  // the window virtualizer grows its total height over the first frames (so the
  // target isn't reachable immediately), and it also resets the window scroll
  // as it mounts/measures (so a one-shot restore gets clobbered). So we keep
  // re-asserting the target across a short time budget, stopping only once it
  // has held for a few consecutive frames — not the first time it's reached.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount.
  useEffect(() => {
    const target = listScrollY.current;
    if (target <= 0) return;
    let raf = 0;
    const start = performance.now();
    // Keep re-asserting the target for a fixed budget: the virtualizer resets
    // the window scroll a few times as it mounts and measures, so a "stop once
    // reached" restore gets clobbered afterward. We simply hold the target for
    // ~600ms (long enough to outlast those resets, short enough that a user who
    // immediately scrolls elsewhere isn't fought for long).
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const goal = Math.min(target, max);
      if (Math.abs(window.scrollY - goal) > 1) window.scrollTo(0, goal);
      if (performance.now() - start < 600) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // view and sort are display prefs, not filters — preserve them across changes.
  const setFilter = (next: FilterState) => {
    navigate({
      search: { ...filterToSearch(next), view: search.view, sort: search.sort },
      replace: true,
    });
  };

  const setView = (next: ViewMode) => {
    navigate({
      search: {
        ...filterToSearch(filter),
        view: next === "row" ? "row" : undefined,
        sort: search.sort,
      },
      replace: true,
    });
  };

  const setSort = (next: SortKey) => {
    navigate({
      search: {
        ...filterToSearch(filter),
        view: search.view,
        sort: next === DEFAULT_SORT ? undefined : next,
      },
      replace: true,
    });
  };

  // Clear every filter and the search query, keeping only display prefs.
  const reset = () =>
    navigate({
      search: { view: search.view, sort: search.sort },
      replace: true,
    });

  const activeCount =
    filter.classes.length +
    filter.facets.length +
    filter.features.length +
    filter.axes.length +
    filter.weights.length +
    filter.widths.length +
    filter.scripts.length +
    filter.languages.length +
    filter.color.length +
    filter.colorFormats.length;

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
              {/* Sort control: a group picker on the left and a direction toggle
                  on the right, joined into one bordered button group. */}
              {(() => {
                const { group, asc } = sortGroupOf(sort);
                const directionless = isDirectionless(group);
                // Directionless groups only expose `asc`; keep the current
                // direction when both groups support it.
                const dirLabel = asc
                  ? group.ascLabel
                  : (group.descLabel ?? group.ascLabel);
                return (
                  <div className="flex h-8 items-center rounded-lg border border-input dark:bg-input/30">
                    <Select
                      value={group.group}
                      onValueChange={(g) => {
                        const next = SORT_GROUPS.find((x) => x.group === g);
                        if (next)
                          setSort(!asc && next.desc ? next.desc : next.asc);
                      }}
                    >
                      <SelectTrigger
                        className="h-full rounded-r-none border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                        aria-label="Sort by"
                      >
                        <SelectValue>{group.group}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_GROUPS.map((g) => (
                          <SelectItem key={g.group} value={g.group}>
                            {g.group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      disabled={directionless}
                      onClick={() => {
                        if (!directionless) {
                          setSort(asc ? (group.desc ?? group.asc) : group.asc);
                        }
                      }}
                      aria-label={`Sort direction: ${dirLabel}`}
                      title={dirLabel}
                      className="flex h-full items-center border-input border-l px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-input/50"
                    >
                      {asc ? (
                        <SortAscendingIcon className="size-4" />
                      ) : (
                        <SortDescendingIcon className="size-4" />
                      )}
                    </button>
                  </div>
                );
              })()}

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
                No fonts match your filters and search. Try broadening them.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
          </Empty>
        ) : (
          <FontGrid
            fonts={results}
            previewText={previewText}
            favorites={favorites}
            onToggleFavorite={toggle}
            view={view}
            selection={filter}
            axisValues={axisValues}
          />
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
