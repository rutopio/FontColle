import {
  MagnifyingGlassIcon,
  RowsIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FilterSidebar } from "@/components/filter/filter-sidebar";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilter } from "@/lib/filter/context";
import { buildFacetIndex } from "@/lib/fonts/data";
import { withFacets } from "@/lib/fonts/facets";
import { useFavorites } from "@/lib/fonts/favorites";
import {
  applyFilters,
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
  SORT_LABELS,
  SORT_OPTIONS,
  type SortKey,
  sortFonts,
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

  // Restore it when returning from a detail page. The window virtualizer grows
  // its total height over the first few frames, so retry across frames until
  // the target is reachable (or we give up after a short budget).
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount.
  useEffect(() => {
    const target = listScrollY.current;
    if (target <= 0) return;
    let frames = 0;
    let raf = 0;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, max));
      frames++;
      if (window.scrollY < target - 1 && frames < 30) {
        raf = requestAnimationFrame(tick);
      }
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
    filter.languages.length;

  return (
    <FilterLayout
      sidebar={
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={setFilter}
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
                <button
                  type="button"
                  onClick={reset}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Clear {activeCount} filters
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[176px]" aria-label="Sort by">
                  <SelectValue placeholder="Sort">
                    {SORT_LABELS[sort]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.group}</SelectLabel>
                      {g.items.map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

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
            selectedWeights={filter.weights.map(Number)}
            selectedWidths={filter.widths.map(Number)}
            selectedAxes={filter.axes}
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
    <div className="relative w-56">
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
