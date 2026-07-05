import { Rows, SquaresFour } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Column, FilterLayout } from "@/components/filter-layout";
import { FontGrid, type ViewMode } from "@/components/font-grid";
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
  const view: ViewMode = search.view === "row" ? "row" : "grid";
  const sort = (search.sort as SortKey) ?? DEFAULT_SORT;

  const results = useMemo(
    () => sortFonts(applyFilters(fonts, filter), sort),
    [fonts, filter, sort]
  );

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

  const activeCount =
    filter.classes.length +
    filter.facets.length +
    filter.features.length +
    filter.axes.length;

  return (
    <FilterLayout index={facetIndex} filter={filter} onFilterChange={setFilter}>
      <Column
        header={
          <>
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <span>{results.length} fonts</span>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      search: { view: search.view, sort: search.sort },
                      replace: true,
                    })
                  }
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Clear {activeCount} filters
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[176px]" aria-label="Sort by">
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
                <TabsList>
                  <TabsTrigger value="grid" aria-label="Grid view">
                    <SquaresFour className="size-4" />
                  </TabsTrigger>
                  <TabsTrigger value="row" aria-label="Row view">
                    <Rows className="size-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </>
        }
      >
        {results.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground text-sm">
            No fonts match these filters.
          </p>
        ) : (
          <FontGrid
            fonts={results}
            previewText={previewText}
            favorites={favorites}
            onToggleFavorite={toggle}
            view={view}
          />
        )}
      </Column>
    </FilterLayout>
  );
}
