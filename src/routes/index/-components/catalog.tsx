import {
  HeartIcon,
  MagnifyingGlassIcon,
  RowsIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { getRouteApi } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { ActiveFilterChips } from "@/components/filter/active-filter-chips";
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
import { PreviewBar } from "@/components/preview-dock";
import { RAIL_HEADER_CELL_MD } from "@/components/rail-button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { fontSlug } from "@/lib/fonts/slug";
import { DEFAULT_SORT, type SortKey, sortFonts } from "@/lib/fonts/sort";
import type { FontRecord } from "@/lib/fonts/types";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { usePreview } from "@/lib/preview/context";
import { useListScrollRestore } from "@/lib/use-list-scroll-restore";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { cn } from "@/lib/utils";
import { SearchInput, type SearchSuggestion } from "./search-input";
import { SortControl } from "./sort-control";

const Route = getRouteApi("/");

// `filter` is a fresh object every render, so `===` is no use. The text query
// is deliberately excluded: folding it in would fade the list out and back on
// every keystroke.
function filterKey(f: FilterState): string {
  const { q: _q, ...rest } = filterToSearch(f);
  return JSON.stringify(rest);
}

export function Catalog({ fonts }: { fonts: FontRecord[] }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { text: previewText } = usePreview();
  const { favorites, toggle } = useFavorites();

  const { listScrollY, lastGroup } = useFilter();
  const facetIndex = useMemo(() => buildFacetIndex(fonts), [fonts]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The URL is the single source of truth: every interaction commits straight
  // to it, so back/forward and shared links work with no state<->URL sync loop.
  const filter = useMemo(() => searchToFilter(search), [search]);
  // Advances only at opacity 0, so the new results and the chip-row reflow both
  // land while invisible. The list never shows a half-applied result set, nor a
  // grid that jumps as the chip row above it resizes.
  const [shownFilter, setShownFilter] = useState(filter);
  const fading = filterKey(filter) !== filterKey(shownFilter);
  // Query-only edits don't fade, so results track the text live.
  useEffect(() => {
    if (!fading && filter.query !== shownFilter.query) {
      setShownFilter(filter);
    }
  }, [fading, filter, shownFilter.query]);

  // sort/fav live in the URL beside the filter and must survive. replace: true
  // so taps don't stack history entries.
  const commitFilter = (next: FilterState) => {
    // Drop the slider position of any axis this deselects, so re-picking it
    // starts at the 50% default instead of resurrecting the old position.
    pruneAxisValues(next.axes);
    navigate({
      search: { ...filterToSearch(next), sort: search.sort, fav: search.fav },
      replace: true,
    });
  };

  // Session-only, not URL-synced: axis ranges differ per font, so there is no
  // universal value to share — each font maps this percent onto its own range.
  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  const setAxisValue = (tag: string, pct: number) =>
    setAxisValues((s) => ({ ...s, [tag]: pct }));
  // Returns the same object when nothing was dropped, so an unrelated filter
  // change doesn't re-render the preview grid.
  const pruneAxisValues = (nextAxes: string[]) =>
    setAxisValues((s) => {
      const keep = new Set(nextAxes);
      const stale = Object.keys(s).filter((tag) => !keep.has(tag));
      if (stale.length === 0) return s;
      const out = { ...s };
      for (const tag of stale) delete out[tag];
      return out;
    });

  // Already in search shape, so it skips commitFilter's round-trip.
  const applyPreset = (preset: FilterSearch) => {
    pruneAxisValues(searchToFilter(preset).axes);
    navigate({
      search: { ...preset, sort: search.sort, fav: search.fav },
      replace: true,
    });
  };

  // The route unmounts on a trip to a detail page, so plain useState would
  // reset to Style every time; the context ref survives it.
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
  // localStorage, not the URL, so a shared link never forces the recipient into
  // your grid/row choice. Sort stays in the URL: it carries result meaning.
  const [viewPref, setViewPref] = useLocalStorageState(
    "font-colle.view",
    "grid"
  );
  const view: ViewMode = viewPref === "row" ? "row" : "grid";
  // Same one-fade lag as shownFilter, so the layouts swap while invisible.
  const [shownView, setShownView] = useState(view);
  const viewFading = view !== shownView;
  const sort = (search.sort as SortKey) ?? DEFAULT_SORT;
  const favOnly = search.fav === "1";

  // Depended on only inside the favorites view: elsewhere, hearting a font
  // would rebuild `results` and replay the grid's entrance animation.
  const favDep = favOnly ? favorites : null;
  const results = useMemo(() => {
    const matched = applyFilters(fonts, shownFilter);
    const filtered = favDep
      ? matched.filter((f) => favDep.includes(f.id))
      : matched;
    // With a query, uFuzzy both filters and ranks, ignoring the sort dropdown.
    if (!shownFilter.query.trim()) return sortFonts(filtered, sort);
    return searchByQuery(filtered, shownFilter.query);
  }, [fonts, shownFilter, sort, favDep]);

  useListScrollRestore(scrollRef, listScrollY);

  const setSort = (next: SortKey) => {
    navigate({
      search: {
        ...filterToSearch(filter),
        sort: next === DEFAULT_SORT ? undefined : next,
        fav: search.fav,
      },
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

  // Ignored while a text field is focused, so typing "r" into the search box
  // types an r and the field's own Escape still works. Bound to the document,
  // there being no single element to hang them off.
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
  const hasQuery = filter.query.trim().length > 0;

  const openFont = useCallback(
    (id: string) => {
      navigate({
        to: "/$tab/$fontId",
        params: { tab: "instances", fontId: fontSlug(id) },
      });
    },
    [navigate]
  );

  // Against the CURRENT (undeferred) query, so the drop-down keeps up with
  // typing, and over the full catalog rather than the facet-filtered set.
  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const q = filter.query.trim();
    if (!q) return [];
    return searchByQuery(fonts, q)
      .slice(0, 8)
      .map((f) => ({ id: f.id, name: f.name }));
  }, [fonts, filter.query]);

  // Only run the edit-distance scan on the empty state, and skip it when the
  // suggestion would just echo the query.
  const suggestions = useMemo(() => {
    if (results.length > 0 || !hasQuery) return [];
    const q = filter.query.trim().toLowerCase();
    return suggestFamilies(filter.query, fonts).filter(
      (s) => s.toLowerCase() !== q
    );
  }, [results.length, hasQuery, filter.query, fonts]);

  return (
    <FilterLayout
      // Preset heads the rail but stays out of FILTER_GROUPS: it is not a
      // section in the panel's scroll, and picking it swaps the panel wholesale.
      rail={
        <div className="flex flex-col gap-1">
          <PresetToggle active={group === "preset"} onSelect={setGroup} />
          <Separator className="my-1" />
          <FilterRail active={group} filter={filter} onSelect={setGroup} />
        </div>
      }
      sidebar={
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={commitFilter}
          group={group}
          // Scrolling decides which group is current; clicking the rail sets
          // `group`, which the panel reads as a jump request.
          onActiveGroupChange={setGroup}
          axisValues={axisValues}
          onAxisValueChange={setAxisValue}
          onApplyPreset={applyPreset}
        />
      }
    >
      <Column
        scrollViewportRef={scrollRef}
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
              {(activeCount > 0 || hasQuery) && (
                <Button
                  variant="outline"
                  onClick={reset}
                  className="h-9 text-destructive"
                >
                  Reset
                  {/* Same md gate as the search field's "/" badge: the phone
                      layout has no physical keyboard, so the shortcut hint is
                      noise on a button that is already tight for space. */}
                  <Kbd className="hidden md:inline-flex">Esc</Kbd>
                </Button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:shrink-0 md:gap-3">
              <span className="flex-1 text-sm" aria-live="polite">
                {/* Mono on the number only: it changes on every filter tick,
                    and tabular digits keep the label beside it from shifting.
                    The word stays proportional so the line still reads as
                    prose. */}
                <span className="font-mono tabular-nums">{results.length}</span>{" "}
                {results.length === 1 ? "font" : "fonts"}
              </span>
              <SortControl
                sort={sort}
                onChange={setSort}
                relevance={filter.query.trim().length > 0}
              />

              <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                <TabsList className="h-8">
                  {/* h-full (both breakpoints, to beat the tab's
                                        own h-9 sm:h-8) so the trigger and its white
                                        indicator fill the h-8 list instead of
                                        overflowing it. */}
                  <TabsTrigger
                    value="grid"
                    aria-label="Grid view"
                    className="h-full sm:h-full"
                  >
                    <span className="hidden sm:inline">Grid</span>
                    <SquaresFourIcon className="size-4" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="row"
                    aria-label="Row view"
                    className="h-full sm:h-full"
                  >
                    <span className="hidden sm:inline">Row</span>
                    <RowsIcon className="size-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Favorite closes the header's row of controls. It belongs with
                  them, not in the sidebar strip it used to sit in: like sort
                  and the view tabs it changes what this list shows (?fav=1),
                  so it reads as the last of the list's own controls. Built as
                  the mirror of the preview field's Top button at the foot of
                  the same column (see PreviewBar and RAIL_HEADER_CELL).

                  Desktop only. On mobile this header wraps to two rows and is
                  already tight with the search field, so Favorite goes back to
                  MobileTopBar beside Theme and About, where it was before. */}
              <div className={cn(RAIL_HEADER_CELL_MD, "hidden md:flex")}>
                <FavoriteToggle variant="header" />
              </div>
            </div>
          </>
        }
        footer={
          <PreviewBar
            onScrollTop={() =>
              scrollRef.current?.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          />
        }
      >
        {/* Chips live OUTSIDE the opacity wrapper but read the COMMITTED
            (deferred) filter, so their own layout animation (a chip springs in /
            the row collapses) fires only once the results have faded to 0 — never
            before, which would yank the list up while it's still visible. They
            keep the spring; it just plays during the invisible beat. The empty
            state renders its own chips inside <Empty>. */}
        {results.length > 0 && (
          <ActiveFilterChips
            filter={shownFilter}
            onChange={commitFilter}
            align="left"
            // The SAME filter the chips show, so a save stores exactly the
            // conditions spelled out beside it.
            currentSearch={filterToSearch(shownFilter)}
          />
        )}
        {/* Opacity wrapper over the RESULTS only (list or empty state). A chip
            change OR a grid<->row switch fades it to 0; its onAnimationComplete
            then commits the new filter / view, so the results swap while
            invisible and fade back in. Wrapping both branches (not just the
            list) keeps the commit firing even when the result set is empty.
            Opacity only — no transform. */}
        {/* Must wrap BOTH the list and the empty state: the commit below rides
            on this fade, so hung off the list alone it strands "No fonts found"
            when a chip is cleared back to a non-empty result. */}
        <motion.div
          className="flex flex-1 flex-col"
          animate={{ opacity: fading || viewFading ? 0 : 1 }}
          transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
          onAnimationComplete={() => {
            // Fires in both directions; only the fade-OUT commits.
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
                  {favOnly ? "No favorites yet" : "No fonts found"}
                </EmptyTitle>
                <EmptyDescription>
                  {favOnly
                    ? "Tap the heart on a font to add it here."
                    : "No fonts match your filters and search. Remove a condition below, or broaden them."}
                </EmptyDescription>
              </EmptyHeader>
              {/* The search text now surfaces as a removable chip inside the
                  ActiveFilterChips row below, alongside the other conditions. */}
              {/* Typo-tolerant nudge: the nearest family names, each swapping
                  the query for that name. Comma-separated, "or" before the last. */}
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
              {/* Committed filter, like the in-list chips, so the row's reflow
                  stays in step with the faded results rather than jumping ahead. */}
              <ActiveFilterChips
                filter={shownFilter}
                onChange={commitFilter}
              />
              {favOnly ? (
                <Button variant="outline" onClick={discoverFonts}>
                  Discover Font
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
      {/* Mobile-only filter access (FAB + bottom drawer). Same shared filter
          state as the desktop rail/panel; hidden on desktop. */}
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
