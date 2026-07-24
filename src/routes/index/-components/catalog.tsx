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
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
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
import { SearchInput, type SearchSuggestion } from "./search-input";
import { SortControl } from "./sort-control";

const Route = getRouteApi("/");

// A stable string identity for a filter's chip-driving part, so we can tell
// whether the live filter has diverged from the one the list is showing. `filter`
// is a fresh object on every render, so `===` is no use; filterToSearch already
// flattens a filter to a plain URL-param object, and JSON of that is order-stable
// for our shapes (string values / string arrays).
//
// The text query (`q`) is deliberately excluded: it comes from the search box,
// not a chip, and search-as-you-type must stay live — folding it in would fade
// the whole list out and back on every keystroke. Query-only changes bypass the
// fade and update the results immediately (see the effect in Catalog).
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

  // The results list scrolls inside the Column's ScrollArea viewport, not the
  // window. The virtualizer and scroll restore both bind to this element.
  const scrollRef = useRef<HTMLDivElement>(null);
  // The search field, so the "/" shortcut can focus it.
  const searchRef = useRef<HTMLInputElement>(null);

  // The URL search params are the single source of truth for the filter. Every
  // interaction commits straight to the URL via commitFilter (a replace: true
  // navigation, cheap because the loader has no loaderDeps and doesn't re-run),
  // so back/forward and shared links Just Work with no state<->URL sync loop.
  //  - `filter` is derived from `search`, so it reflects the live URL and drives
  //    everything that must respond instantly: pills, rail, chips, active count,
  //    the search input and the sort write.
  //  - `deferredFilter` trails it: the heavy applyFilters + grid re-render run
  //    against this deferred copy, and it advances only while the list is faded
  //    out (see below), so the results and the chip row swap together, unseen.
  const filter = useMemo(() => searchToFilter(search), [search]);
  // The filter the results list + its chip row currently show. It trails `filter`
  // by one fade: when `filter` changes we fade the list out, and only once it has
  // reached opacity 0 do we advance `deferredFilter` to it. So the new results
  // and the chip-row reflow (a chip appearing, or the row collapsing to nothing)
  // both happen while the list is invisible; the list then fades back in already
  // in its final position. The user never sees a half-applied result set, and
  // never sees the grid jump up or down as the chip row above it resizes.
  const [deferredFilter, setDeferredFilter] = useState(filter);
  // `fading` is true from the moment `filter`'s chip part diverges from what the
  // list shows until the fade-out completes and we commit the new filter. It
  // drives the list's opacity: true -> fade out, false -> fade in.
  const fading = filterKey(filter) !== filterKey(deferredFilter);
  // The chip fade-out advances `deferredFilter` from the wrapper's
  // onAnimationComplete (see the body), which fires only after opacity has
  // reached 0 — so the results recompute and swap while invisible, then fade
  // back in. The wrapper wraps BOTH the list and the empty state, so that
  // callback fires whichever is on screen (an earlier version hung it off the
  // list alone and stranded "No fonts found" when a chip was cleared back to a
  // non-empty result).
  //
  // Query-only edits (typing in the search box) don't fade — commit them at once
  // so results track the text live.
  useEffect(() => {
    if (!fading && filter.query !== deferredFilter.query) {
      setDeferredFilter(filter);
    }
  }, [fading, filter, deferredFilter.query]);

  // Commit a filter change to the URL. Preserves the non-filter view modes
  // (sort, favorites) that live in the URL alongside the filter but aren't part
  // of it. replace: true so intermediate taps don't stack history entries.
  const commitFilter = (next: FilterState) => {
    // Drop the slider position of any axis this change deselects, so a Reset
    // (or a single-pill clear, or the Static font-type wipe) sends the slider
    // back to its 50% default instead of resurrecting the old position the
    // next time that axis is picked.
    pruneAxisValues(next.axes);
    navigate({
      search: { ...filterToSearch(next), sort: search.sort, fav: search.fav },
      replace: true,
    });
  };

  // Relative position (0-100%) per selected variable-axis tag, from the
  // sidebar sliders. Session-only UI state, not URL-synced: there's no
  // universal min/max across fonts to persist as a real filter value, so each
  // font maps this percent onto its own axis range for the live preview.
  const [axisValues, setAxisValues] = useState<Record<string, number>>({});
  const setAxisValue = (tag: string, pct: number) =>
    setAxisValues((s) => ({ ...s, [tag]: pct }));
  // Keep only the tags still selected. Returns the same object when nothing was
  // dropped, so an unrelated filter change doesn't re-render the preview grid.
  const pruneAxisValues = (nextAxes: string[]) =>
    setAxisValues((s) => {
      const keep = new Set(nextAxes);
      const stale = Object.keys(s).filter((tag) => !keep.has(tag));
      if (stale.length === 0) return s;
      const out = { ...s };
      for (const tag of stale) delete out[tag];
      return out;
    });

  // Apply a saved preset. Its stored value is already in search shape, so it
  // goes straight to the URL rather than through commitFilter's FilterState
  // round-trip. sort/fav ride along untouched: a preset is a set of filter
  // conditions, not a view, so it must not change how results are ordered or
  // whether the favorites view is on.
  const applyPreset = (preset: FilterSearch) => {
    pruneAxisValues(searchToFilter(preset).axes);
    navigate({
      search: { ...preset, sort: search.sort, fav: search.fav },
      replace: true,
    });
  };

  // Which filter group the sidebar panel shows. Session-only UI state, seeded
  // from the context ref so returning from a font's detail page reopens the
  // panel you left (the route unmounts on that trip, so plain useState would
  // reset to Style every time). Position within the panel isn't restored.
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
  // View mode is a personal-device preference, kept in localStorage rather than
  // the URL so a shared link never forces the recipient into your grid/row
  // choice. Sort stays in the URL, it can carry result meaning worth sharing.
  const [viewPref, setViewPref] = useLocalStorageState(
    "font-colle.view",
    "grid"
  );
  const view: ViewMode = viewPref === "row" ? "row" : "grid";
  // The view the grid currently shows. Like deferredFilter, it trails `view` by
  // one fade so a grid<->row switch fades the list out, swaps layout while it's
  // invisible, and fades back in — instead of the two layouts hard-cutting.
  const [deferredView, setDeferredView] = useState(view);
  const viewFading = view !== deferredView;
  const sort = (search.sort as SortKey) ?? DEFAULT_SORT;
  // Favorites-only view mode (rail heart toggle, ?fav=1). Narrows the result set
  // to hearted fonts; independent of the filter pills so it composes with them.
  const favOnly = search.fav === "1";

  // Favorites only affect the result set in the favorites view. Depend on the
  // list only then, so hearting a font outside that view doesn't rebuild
  // `results` (which would re-run the grid's entrance animation, a needless
  // flash for what is just a heart toggle).
  const favDep = favOnly ? favorites : null;
  const results = useMemo(() => {
    const matched = applyFilters(fonts, deferredFilter);
    const filtered = favDep
      ? matched.filter((f) => favDep.includes(f.id))
      : matched;
    // With a search query, uFuzzy both filters and ranks the facet-passed
    // candidates (best textual match first, ignoring the sort dropdown). Without
    // one, the chosen sort orders the full set.
    if (!deferredFilter.query.trim()) return sortFonts(filtered, sort);
    return searchByQuery(filtered, deferredFilter.query);
  }, [fonts, deferredFilter, sort, favDep]);

  useListScrollRestore(scrollRef, listScrollY);

  // Sort writes the URL immediately, it's cheap and doesn't gate on the
  // deferred filter. It carries the current filter and the favorites view
  // along so the URL keeps a consistent shape.
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
  // Clear every filter and the search query, keeping only display prefs. Writes
  // the emptied filter straight to the URL, carrying sort/fav along.
  const reset = useCallback(
    () =>
      navigate({
        search: { sort: search.sort, fav: search.fav },
        replace: true,
      }),
    [navigate, search.sort, search.fav]
  );

  // Toggle the favorites-only view, matching the rail's heart link: drop the
  // param when leaving, set it when entering, keeping the rest of the search.
  const toggleFavOnly = useCallback(() => {
    navigate({
      search: (prev) => ({ ...prev, fav: favOnly ? undefined : "1" }),
      replace: true,
    });
  }, [navigate, favOnly]);

  // Catalog keyboard shortcuts, the usual directory-site set: "/" focuses the
  // search field, "g"/"r" switch the grid/row view, "f" toggles the favorites
  // view, Escape resets the filters.
  // They're ignored while a text field is focused (so typing "r" into the search
  // box types an r, and the field's own Escape/blur still works). Bound to the
  // document since there's no single focused element to hang them off.
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
  // Leave the favorites view and clear filters, landing on the full catalog,
  // the CTA shown when there are no favorites yet.
  const discoverFonts = () => {
    navigate({ search: { sort: search.sort }, replace: true });
  };

  const activeCount = activeFilterCount(filter);
  // Reset clears the search query as well as the filters, so the control shows
  // whenever either is active. One neutral "Reset" label covers all cases (only
  // filters, only a search, or both) without a misleading "filter" wording.
  const hasQuery = filter.query.trim().length > 0;

  // Open a font's detail page. Backs both the search box's Enter (top match) and
  // clicks on an autocomplete row.
  const openFont = useCallback(
    (id: string) => {
      navigate({
        to: "/$tab/$fontId",
        params: { tab: "instances", fontId: fontSlug(id) },
      });
    },
    [navigate]
  );

  // Live autocomplete list under the search box: the top fuzzy matches for the
  // CURRENT (undeferred) query, ranked by the same searchByQuery the grid uses,
  // so the drop-down mirrors the results below. Runs against the full catalog by
  // name — a jump-to affordance, independent of the active facet filters. Empty
  // (and so the panel hidden) when the query is blank.
  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const q = filter.query.trim();
    if (!q) return [];
    return searchByQuery(fonts, q)
      .slice(0, 8)
      .map((f) => ({ id: f.id, name: f.name }));
  }, [fonts, filter.query]);

  // Typo-tolerant fallback for the pure-substring search: when a query returns
  // nothing, suggest the closest family name ("Did you mean Inter?"). Only run
  // the edit-distance scan on the empty state, and skip it when the suggestion
  // would just echo the query.
  const suggestions = useMemo(() => {
    if (results.length > 0 || !hasQuery) return [];
    const q = filter.query.trim().toLowerCase();
    return suggestFamilies(filter.query, fonts).filter(
      (s) => s.toLowerCase() !== q
    );
  }, [results.length, hasQuery, filter.query, fonts]);

  return (
    <FilterLayout
      rail={<FilterRail active={group} filter={filter} onSelect={setGroup} />}
      // Preset sits in the sidebar footer with Favorite, not in the rail: both
      // are device-local personal state, not facets of the catalog.
      personal={
        <PresetToggle active={group === "preset"} onSelect={setGroup} />
      }
      sidebar={
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={commitFilter}
          group={group}
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
            filter={deferredFilter}
            onChange={commitFilter}
            align="left"
            // Encoded from the SAME deferred filter the chips show, so what a
            // save stores is exactly the conditions spelled out beside it.
            currentSearch={filterToSearch(deferredFilter)}
          />
        )}
        {/* Opacity wrapper over the RESULTS only (list or empty state). A chip
            change OR a grid<->row switch fades it to 0; its onAnimationComplete
            then commits the new filter / view, so the results swap while
            invisible and fade back in. Wrapping both branches (not just the
            list) keeps the commit firing even when the result set is empty.
            Opacity only — no transform. */}
        <motion.div
          className="flex flex-1 flex-col"
          animate={{ opacity: fading || viewFading ? 0 : 1 }}
          transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
          onAnimationComplete={() => {
            // Fires at the end of both directions; only the fade-OUT (still
            // pending) should commit the live filter / view, flipping the
            // pending flag false and starting the fade back in.
            if (fading) setDeferredFilter(filter);
            if (viewFading) setDeferredView(view);
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
                filter={deferredFilter}
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
              view={deferredView}
              selection={deferredFilter}
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
