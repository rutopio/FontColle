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
import { toast } from "sonner";
import { AboutLink } from "@/components/about-link";
import { CountFlash } from "@/components/count-flash";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { FavoritesTransfer } from "@/components/favorites-transfer";
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
import { PreviewToggle } from "@/components/filter/preview-toggle";
import { Column, FilterLayout } from "@/components/filter-layout";
import {
  clampCols,
  DEFAULT_COLS,
  FontGrid,
  type ViewMode,
} from "@/components/font-grid";
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
import { useListScrollRestore } from "@/hooks/use-list-scroll-restore";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useFilterLayout } from "@/lib/filter/context";
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
import { useLastDetailTab } from "@/lib/fonts/last-tab";
import { DEFAULT_SORT, type SortKey, sortFonts } from "@/lib/fonts/sort";
import type { FontRecord } from "@/lib/fonts/types";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { usePreview } from "@/lib/preview/context";
import { SearchInput, type SearchSuggestion } from "./search-input";
import { SortControl } from "./sort-control";
import { VIEW_TABS_WIDTH, ViewTabs } from "./view-tabs";

const Route = getRouteApi("/");

function filterKey(f: FilterState): string {
  const { q: _q, ...rest } = filterToSearch(f);
  return JSON.stringify(rest);
}

export function Catalog({ fonts }: { fonts: FontRecord[] }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const {
    text: previewText,
    size: previewSize,
    leading: previewLeading,
    coverOnly,
    setCoverOnly,
    showPreview,
    setShowPreview,
    favFirst,
  } = usePreview();
  const { favorites, toggle } = useFavorites();

  const { listScrollY, lastGroup } = useFilterLayout();
  const facetIndex = useMemo(() => buildFacetIndex(fonts), [fonts]);
  const knownIds = useMemo(() => new Set(fonts.map((f) => f.id)), [fonts]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filter = useMemo(() => searchToFilter(search), [search]);
  const [shownFilter, setShownFilter] = useState(filter);
  const fading = filterKey(filter) !== filterKey(shownFilter);
  if (!fading && filter.query !== shownFilter.query) {
    setShownFilter(filter);
  }

  const commitFilter = (next: FilterState) => {
    pruneAxisValues(next.axes);
    navigate({
      search: { ...filterToSearch(next), fav: search.fav },
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
      search: { ...preset, fav: search.fav },
      replace: true,
    });
  };

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
  const [lastTab] = useLastDetailTab();
  const [viewPref, setViewPref] = useLocalStorageState(
    "font-fridge.view",
    "grid"
  );
  const view: ViewMode = viewPref === "row" ? "row" : "grid";
  const [colsPref, setColsPref] = useLocalStorageState(
    "font-fridge.cols",
    String(DEFAULT_COLS)
  );
  const maxCols = clampCols(Number.parseInt(colsPref, 10));
  const [shownView, setShownView] = useState(view);
  const viewFading = view !== shownView;
  // "" = relevance ordering; distinct from DEFAULT_SORT so a query keeps best-match order.
  const [sortPref, setSortPref] = useLocalStorageState(
    "font-fridge.sort",
    DEFAULT_SORT
  );
  const byRelevance = sortPref === "";
  const sort = byRelevance ? DEFAULT_SORT : (sortPref as SortKey);
  const favOnly = search.fav === "1";

  const deferredFilter = useDeferredValue(shownFilter);
  const deferredPreview = useDeferredValue(previewText);
  const renderableIds = useRenderableFontIds(deferredPreview, coverOnly);
  const favDep = favOnly ? favorites : null;
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const { results, coverageHid } = useMemo(() => {
    const covered = applyFilters(fonts, deferredFilter);
    const matched = renderableIds
      ? covered.filter((f) => renderableIds.has(f.id))
      : covered;
    const coverageHid = covered.length - matched.length;
    const filtered = favDep
      ? matched.filter((f) => favDep.includes(f.id))
      : matched;
    const order = (list: FontRecord[]) => {
      if (!deferredFilter.query.trim()) return sortFonts(list, sort);
      const matches = searchByQuery(list, deferredFilter.query);
      return byRelevance ? matches : sortFonts(matches, sort);
    };
    const ordered = order(filtered);
    // Favorites float to the top, each group keeping the sort order above.
    const results =
      favFirst && !favOnly && favSet.size > 0
        ? [
            ...ordered.filter((f) => favSet.has(f.id)),
            ...ordered.filter((f) => !favSet.has(f.id)),
          ]
        : ordered;
    return { results, coverageHid };
  }, [
    fonts,
    deferredFilter,
    sort,
    byRelevance,
    favDep,
    renderableIds,
    favFirst,
    favOnly,
    favSet,
  ]);

  useListScrollRestore(scrollRef, listScrollY);

  const hasQuery = filter.query.trim().length > 0;

  const setSort = (next: SortKey) => setSortPref(next);

  const setRelevance = () => setSortPref("");

  const setView = (next: ViewMode) => setViewPref(next);
  const reset = useCallback(
    () =>
      navigate({
        search: { fav: search.fav },
        replace: true,
      }),
    [navigate, search.fav]
  );

  const resetFromKeyboard = useCallback(() => {
    const before = search;
    const { sort: _sort, fav: _fav, ...conditions } = before;
    const cleared = Object.values(conditions).filter(
      (v) => v !== undefined
    ).length;
    if (cleared === 0) return;
    reset();
    toast.success("Filters cleared", {
      description: `${cleared} ${cleared === 1 ? "condition" : "conditions"} removed with Esc`,
      action: {
        label: "Undo",
        onClick: () => navigate({ search: before, replace: true }),
      },
      id: "filters-cleared",
    });
  }, [navigate, reset, search]);

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
        resetFromKeyboard();
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
  }, [setViewPref, resetFromKeyboard, toggleFavOnly]);
  const discoverFonts = () => {
    navigate({ search: {}, replace: true });
  };

  const activeCount = activeFilterCount(filter);
  const coverageEmpty = results.length === 0 && coverageHid > 0 && !favOnly;

  const openFont = useCallback(
    (id: string) => {
      navigate({
        to: "/$tab/$fontId",
        params: { tab: lastTab, fontId: id },
        viewTransition: true,
      });
    },
    [navigate, lastTab]
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
          <PreviewToggle active={showPreview} onToggle={setShowPreview} />
          <Separator className="my-1" />
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
          restoreScroll
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
            <div className="hidden lg:block">
              <SortControl
                sort={sort}
                onChange={setSort}
                onRelevance={setRelevance}
                relevance={hasQuery}
                sortedByRelevance={byRelevance}
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
              <CountFlash value={results.length} className="font-mono" />{" "}
              {results.length === 1 ? "font" : "fonts"}
            </span>
            <div className="md:hidden">
              <SortControl
                sort={sort}
                onChange={setSort}
                onRelevance={setRelevance}
                relevance={hasQuery}
                sortedByRelevance={byRelevance}
              />
            </div>
            <ViewTabs
              view={view}
              onChange={setView}
              cols={maxCols}
              onColsChange={(n) => setColsPref(String(n))}
            />

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
          ((results.length > 0 &&
            (hasActiveFilterChips(shownFilter) ||
              previewText.trim().length > 0)) ||
            (favOnly && results.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2">
              {(hasActiveFilterChips(shownFilter) ||
                previewText.trim().length > 0) && (
                <ActiveFilterChips
                  filter={shownFilter}
                  onChange={commitFilter}
                  align="left"
                  currentSearch={filterToSearch(shownFilter)}
                  results={results}
                />
              )}
              {favOnly && (
                <div className="ml-auto">
                  <FavoritesTransfer knownIds={knownIds} />
                </div>
              )}
            </div>
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
                    ? "Tap the heart on a font to add it here, or import a favorites file from another device."
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" onClick={discoverFonts}>
                    Discover Font
                  </Button>
                  <FavoritesTransfer knownIds={knownIds} />
                </div>
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
              previewSize={previewSize}
              previewLeading={previewLeading}
              favorites={favorites}
              onToggleFavorite={toggle}
              view={shownView}
              maxCols={maxCols}
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
