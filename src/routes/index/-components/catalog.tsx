import { HeartIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { getRouteApi } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import {
  ActiveFilterChips,
  hasActiveFilterChips,
} from "@/components/filter/active-filter-chips";
import { FilterDrawer } from "@/components/filter/filter-drawer";
import { FilterRail } from "@/components/filter/filter-rail";
import { FilterSidebar } from "@/components/filter/filter-sidebar";
import {
  DEFAULT_FILTER_GROUP,
  type FilterGroupId,
} from "@/components/filter/groups";
import { PresetToggle } from "@/components/filter/preset-toggle";
import { Column, FilterLayout } from "@/components/filter-layout";
import { FontGrid, type ViewMode } from "@/components/font-grid";
import { GithubLink } from "@/components/github-link";
import {
  HeaderButtonGroup,
  HeaderButtonGroupItem,
} from "@/components/header-button-group";
import { PreviewBar } from "@/components/preview-dock";
import { RAIL_HEADER_CELL } from "@/components/rail-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { useFilter } from "@/lib/filter/context";
import { useFavorites } from "@/lib/fonts/favorites";
import {
  activeFilterCount,
  applyFilters,
  buildFacetIndex,
  type FilterSearch,
  type FilterState,
  filterToSearch,
  searchByQuery,
  searchToFilter,
  suggestFamilies,
} from "@/lib/fonts/filter";
import { useRenderableFontIds } from "@/lib/fonts/glyph-index";
import { fontSlug } from "@/lib/fonts/slug";
import { DEFAULT_SORT, type SortKey, sortFonts } from "@/lib/fonts/sort";
import type { FontRecord } from "@/lib/fonts/types";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { usePreview } from "@/lib/preview/context";
import { useListScrollRestore } from "@/lib/use-list-scroll-restore";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { SearchInput, type SearchSuggestion } from "./search-input";
import { SortControl } from "./sort-control";
import { VIEW_TABS_WIDTH, ViewTabs } from "./view-tabs";

const Route = getRouteApi("/");

// Excludes text query so typing doesn't trigger fade transitions.
function filterKey(f: FilterState): string {
  const { q: _q, ...rest } = filterToSearch(f);
  return JSON.stringify(rest);
}

export function Catalog({ fonts }: { fonts: FontRecord[] }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { text: previewText, coverOnly, setCoverOnly } = usePreview();
  const { favorites, toggle } = useFavorites();

  const { listScrollY, lastGroup } = useFilter();
  const facetIndex = useMemo(() => buildFacetIndex(fonts), [fonts]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filter = useMemo(() => searchToFilter(search), [search]);
  const [shownFilter, setShownFilter] = useState(filter);
  const fading = filterKey(filter) !== filterKey(shownFilter);
  // Render-time sync: when filter keys match (no fade) but query diverged, update immediately.
  if (!fading && filter.query !== shownFilter.query) {
    setShownFilter(filter);
  }

  const commitFilter = (next: FilterState) => {
    pruneAxisValues(next.axes);
    navigate({
      search: { ...filterToSearch(next), sort: search.sort, fav: search.fav },
      replace: true,
    });
  };

  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  const setAxisValue = (tag: string, pct: number) =>
    setAxisValues((s) => ({ ...s, [tag]: pct }));
  const pruneAxisValues = (nextAxes: string[]) =>
    setAxisValues((s) => {
      const keep = new Set(nextAxes);
      const stale = Object.keys(s).filter((tag) => !keep.has(tag));
      if (stale.length === 0) return s;
      const out = { ...s };
      for (const tag of stale) delete out[tag];
      return out;
    });

  const applyPreset = (preset: FilterSearch) => {
    pruneAxisValues(searchToFilter(preset).axes);
    navigate({
      search: { ...preset, sort: search.sort, fav: search.fav },
      replace: true,
    });
  };

  // Survives route unmount via context ref.
  const [group, setGroupState] = useState<FilterGroupId>(
    () => lastGroup.current ?? DEFAULT_FILTER_GROUP
  );
  const setGroup = useCallback(
    (next: FilterGroupId) => {
      lastGroup.current = next;
      setGroupState(next);
    },
    [lastGroup]
  );
  const [viewPref, setViewPref] = useLocalStorageState(
    "font-colle.view",
    "grid"
  );
  const view: ViewMode = viewPref === "row" ? "row" : "grid";
  const [shownView, setShownView] = useState(view);
  const viewFading = view !== shownView;
  const sort = (search.sort as SortKey) ?? DEFAULT_SORT;
  const favOnly = search.fav === "1";

  // Deferred so keystrokes paint immediately.
  const deferredFilter = useDeferredValue(shownFilter);
  const deferredPreview = useDeferredValue(previewText);
  // null while the toggle is off or the coverage index has yet to load.
  const renderableIds = useRenderableFontIds(deferredPreview, coverOnly);
  const favDep = favOnly ? favorites : null;
  const { results, coverageHid } = useMemo(() => {
    const covered = applyFilters(fonts, deferredFilter);
    const matched = renderableIds
      ? covered.filter((f) => renderableIds.has(f.id))
      : covered;
    // Fonts the preview text alone removed, so an empty list can say why.
    const coverageHid = covered.length - matched.length;
    const filtered = favDep
      ? matched.filter((f) => favDep.includes(f.id))
      : matched;
    const order = (list: FontRecord[]) => {
      if (!deferredFilter.query.trim()) return sortFonts(list, sort);
      // Keep relevance order unless user picks an explicit sort.
      const matches = searchByQuery(list, deferredFilter.query);
      return search.sort ? sortFonts(matches, sort) : matches;
    };
    return { results: order(filtered), coverageHid };
  }, [fonts, deferredFilter, sort, search.sort, favDep, renderableIds]);

  useListScrollRestore(scrollRef, listScrollY);

  const hasQuery = filter.query.trim().length > 0;

  const setSort = (next: SortKey) => {
    navigate({
      search: {
        ...filterToSearch(filter),
        sort: next === DEFAULT_SORT && !hasQuery ? undefined : next,
        fav: search.fav,
      },
      replace: true,
    });
  };

  const setRelevance = () => {
    navigate({
      search: { ...filterToSearch(filter), sort: undefined, fav: search.fav },
      replace: true,
    });
  };

  const setView = (next: ViewMode) => setViewPref(next);
  const reset = useCallback(
    () =>
      navigate({
        search: { sort: search.sort, fav: search.fav },
        replace: true,
      }),
    [navigate, search.sort, search.fav]
  );

  const toggleFavOnly = useCallback(() => {
    navigate({
      search: (prev) => ({ ...prev, fav: favOnly ? undefined : "1" }),
      replace: true,
    });
  }, [navigate, favOnly]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        reset();
      } else if (e.key === "g") {
        setViewPref("grid");
      } else if (e.key === "r") {
        setViewPref("row");
      } else if (e.key === "f") {
        toggleFavOnly();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setViewPref, reset, toggleFavOnly]);
  const discoverFonts = () => {
    navigate({ search: { sort: search.sort }, replace: true });
  };

  const activeCount = activeFilterCount(filter);
  // The preview text is the sole reason the list is empty: it is not a filter
  // chip, so without this the empty state would point at conditions that are
  // not what actually emptied the list.
  const coverageEmpty = results.length === 0 && coverageHid > 0 && !favOnly;

  const openFont = useCallback(
    (id: string) => {
      navigate({
        to: "/$tab/$fontId",
        params: { tab: "instances", fontId: fontSlug(id) },
        viewTransition: true,
      });
    },
    [navigate]
  );

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const q = deferredFilter.query.trim();
    if (!q) return [];
    return searchByQuery(fonts, q)
      .slice(0, 8)
      .map((f) => ({ id: f.id, name: f.name }));
  }, [fonts, deferredFilter.query]);

  const suggestions = useMemo(() => {
    if (results.length > 0 || !hasQuery) return [];
    const q = filter.query.trim().toLowerCase();
    return suggestFamilies(filter.query, fonts).filter(
      (s) => s.toLowerCase() !== q
    );
  }, [results.length, hasQuery, filter.query, fonts]);

  return (
    <FilterLayout
      rail={
        <div className="flex flex-col gap-1">
          <FilterRail
            active={group}
            filter={filter}
            onSelect={setGroup}
            indicatorId="filter-rail-indicator"
          />
          <Separator className="my-1" />
          <PresetToggle
            active={group === "preset"}
            onSelect={setGroup}
            indicatorId="filter-rail-indicator"
          />
        </div>
      }
      sidebar={
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={commitFilter}
          group={group}
          onActiveGroupChange={setGroup}
          axisValues={axisValues}
          onAxisValueChange={setAxisValue}
          onApplyPreset={applyPreset}
        />
      }
      header={
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2 max-md:w-full">
            <SearchInput
              inputRef={searchRef}
              query={filter.query}
              onQueryChange={(query) => commitFilter({ ...filter, query })}
              suggestions={searchSuggestions}
              onPick={openFont}
            />
            <div className="hidden md:block">
              <SortControl
                sort={sort}
                onChange={setSort}
                onRelevance={setRelevance}
                relevance={hasQuery}
                sortedByRelevance={!search.sort}
              />
            </div>
            {(activeCount > 0 || hasQuery) && (
              <Button
                variant="outline"
                onClick={reset}
                className={`h-9 text-destructive ${VIEW_TABS_WIDTH}`}
              >
                Reset
                <Kbd className="hidden md:inline-flex">Esc</Kbd>
              </Button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:shrink-0 md:gap-3">
            <span className="flex-1 text-sm" aria-live="polite">
              <span className="font-mono tabular-nums">{results.length}</span>{" "}
              {results.length === 1 ? "font" : "fonts"}
            </span>
            <div className="md:hidden">
              <SortControl
                sort={sort}
                onChange={setSort}
                onRelevance={setRelevance}
                relevance={hasQuery}
                sortedByRelevance={!search.sort}
              />
            </div>
            <ViewTabs view={view} onChange={setView} />

            <div className="hidden shrink-0 items-center gap-1 md:flex">
              <Separator
                aria-hidden
                orientation="vertical"
                className="mx-2 h-5"
              />
              <HeaderButtonGroup className="relative flex items-center gap-1">
                <HeaderButtonGroupItem index={0} className={RAIL_HEADER_CELL}>
                  <ThemeToggle variant="header" />
                </HeaderButtonGroupItem>
                <HeaderButtonGroupItem index={1} className={RAIL_HEADER_CELL}>
                  <AboutLink variant="header" />
                </HeaderButtonGroupItem>
                <HeaderButtonGroupItem index={2} className={RAIL_HEADER_CELL}>
                  <GithubLink variant="header" />
                </HeaderButtonGroupItem>
                <HeaderButtonGroupItem index={3} className={RAIL_HEADER_CELL}>
                  <FavoriteToggle variant="header" />
                </HeaderButtonGroupItem>
              </HeaderButtonGroup>
            </div>
          </div>
        </>
      }
    >
      <Column
        scrollViewportRef={scrollRef}
        toolbar={
          results.length > 0 &&
          hasActiveFilterChips(shownFilter) && (
            <ActiveFilterChips
              filter={shownFilter}
              onChange={commitFilter}
              align="left"
              currentSearch={filterToSearch(shownFilter)}
            />
          )
        }
        footer={
          <PreviewBar
            coverageToggle
            onScrollTop={() =>
              scrollRef.current?.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          />
        }
      >
        <motion.div
          className="flex flex-1 flex-col"
          animate={{ opacity: fading || viewFading ? 0 : 1 }}
          transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
          onAnimationComplete={() => {
            if (fading) setShownFilter(filter);
            if (viewFading) setShownView(view);
          }}
        >
          {results.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {favOnly ? <HeartIcon /> : <MagnifyingGlassIcon />}
                </EmptyMedia>
                <EmptyTitle>
                  {favOnly
                    ? "No favorites yet"
                    : coverageEmpty
                      ? "No fonts have these characters"
                      : "No fonts found"}
                </EmptyTitle>
                <EmptyDescription>
                  {favOnly
                    ? "Tap the heart on a font to add it here."
                    : coverageEmpty
                      ? "No font in the catalog can render your preview text. Shorten it, or keep browsing with the missing characters shown as boxes."
                      : "No fonts match your filters and search. Remove a condition below, or broaden them."}
                </EmptyDescription>
              </EmptyHeader>
              {suggestions.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  Did you mean{" "}
                  {suggestions.map((s, i) => (
                    <Fragment key={s}>
                      {i > 0 && (
                        <span>
                          {i === suggestions.length - 1 ? " or " : ", "}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => commitFilter({ ...filter, query: s })}
                        className="font-medium text-foreground underline decoration-muted-foreground/50 hover:decoration-foreground"
                      >
                        {s}
                      </button>
                    </Fragment>
                  ))}
                  ?
                </p>
              )}
              <ActiveFilterChips filter={shownFilter} onChange={commitFilter} />
              {favOnly ? (
                <Button variant="outline" onClick={discoverFonts}>
                  Discover Font
                </Button>
              ) : coverageEmpty ? (
                <Button variant="outline" onClick={() => setCoverOnly(false)}>
                  Show every font anyway
                </Button>
              ) : (
                <Button variant="outline" onClick={reset}>
                  Reset
                </Button>
              )}
            </Empty>
          ) : (
            <FontGrid
              fonts={results}
              previewText={previewText}
              favorites={favorites}
              onToggleFavorite={toggle}
              view={shownView}
              selection={shownFilter}
              axisValues={axisValues}
              scrollRef={scrollRef}
            />
          )}
        </motion.div>
      </Column>
      <FilterDrawer
        index={facetIndex}
        filter={filter}
        onChange={commitFilter}
        group={group}
        onGroupChange={setGroup}
        axisValues={axisValues}
        onAxisValueChange={setAxisValue}
        onApplyPreset={applyPreset}
      />
    </FilterLayout>
  );
}
