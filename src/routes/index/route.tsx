import {
  HeartIcon,
  MagnifyingGlassIcon,
  RowsIcon,
  SquaresFourIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useDeferredValue,
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
import { Column, FilterLayout } from "@/components/filter-layout";
import { FontCard } from "@/components/font-card";
import { FontGrid, SkeletonGrid, type ViewMode } from "@/components/font-grid";
import { FontRow } from "@/components/font-row";
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
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilter } from "@/lib/filter/context";
import { catalogQueryOptions } from "@/lib/fonts/catalog";
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
  suggestFamily,
} from "@/lib/fonts/filter";
import { fetchFirstPage } from "@/lib/fonts/first-page";
import { DEFAULT_SORT, type SortKey, sortFonts } from "@/lib/fonts/sort";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { useListScrollRestore } from "@/lib/use-list-scroll-restore";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { cn } from "@/lib/utils";
import { SortControl } from "./-components/sort-control";

export const Route = createFileRoute("/")({
  component: App,
  validateSearch: (raw): FilterSearch => parseFilterSearch(raw),
  // Returns ONLY the first-page slice (~24 records, a few tens of KB), never the
  // full catalog, the Worker must not parse the 14 MB catalog (Error 1102). The
  // full catalog still loads client-side via catalogQueryOptions. This slice is
  // what lets a default `/` visit's SSR HTML carry real font cards + /specimen/
  // links for crawlers and non-JS fetchers (see the first-page render in App).
  loader: async () => ({ firstPage: await fetchFirstPage() }),
  head: () => {
    // Filter/sort params are transient views of the same catalog, not distinct
    // pages, so the canonical is the bare list. og:url matches.
    const canonical = absoluteUrl("/");
    if (!canonical) return {};
    // WebSite structured data with a SearchAction, so engines can offer a
    // sitelinks search box straight into the catalog. The query template uses
    // the real text-search param `q` (see filterToSearch in filter/state.ts).
    // Emitted only with an absolute origin, like the canonical tag above.
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: canonical,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${absoluteUrl("/?q=")}{search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    });
    return {
      meta: [{ property: "og:url", content: canonical }],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [{ type: "application/ld+json", children: jsonLd }],
    };
  },
});

// True when the URL carries no filter, query, sort deviation, or favorites view,
// i.e. the bare `/` catalog. Only then is it correct to SSR the unfiltered
// first-page slice: under a filtered/sorted/fav URL that slice wouldn't match
// what the page should show, so those keep the skeleton-only pending state.
function isDefaultView(search: FilterSearch): boolean {
  if (search.sort || search.fav) return false;
  // activeFilterCount deliberately excludes the text query (see describe.ts /
  // tasks/todo.md 3.1), so check `q` explicitly or a search URL would SSR the
  // unfiltered first-page slice.
  if (search.q) return false;
  return activeFilterCount(searchToFilter(search)) === 0;
}

// Fetches the static catalog on the client (see catalogQueryOptions). While it
// loads we show a skeleton (or, on the default `/` view, the loader's first-page
// slice as real cards); on success the real Catalog view swaps in. Fetching the
// full catalog on the client instead of in a Worker loader is what keeps the
// home page under the Worker's per-request limits (Error 1102, tasks/todo.md P0).
function App() {
  const search = Route.useSearch();
  const { data: fonts, isError } = useQuery(catalogQueryOptions());
  if (isError) throw new Error("Failed to load the font catalog.");
  // While the full catalog loads: on a default `/` visit render the loader's
  // first-page slice as real cards (so crawlers/no-JS see ~24 font links), with
  // skeletons filling the rest. On any filtered/sorted URL keep the plain
  // skeleton, SSR-ing unfiltered content under a filtered URL would be wrong.
  // This pending tree is identical server-side and on the first client render
  // (the loader data is the same, favorites hydrate to [] as today), so the swap
  // to Catalog on catalog-load matches today's skeleton->content swap with no
  // hydration mismatch.
  if (!fonts) {
    return isDefaultView(search) ? <FirstPagePending /> : <ListPending />;
  }
  return <Catalog fonts={fonts} />;
}

function Catalog({ fonts }: { fonts: FontRecord[] }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
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
  //  - `deferredFilter` trails it (useDeferredValue): the heavy applyFilters +
  //    grid re-render run against this deferred copy, so React keeps the previous
  //    results on screen while a burst of changes settles. The list never
  //    flashes a skeleton or a transient "no results" between two chips.
  const filter = useMemo(() => searchToFilter(search), [search]);
  const deferredFilter = useDeferredValue(filter);

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
    const sorted = sortFonts(filtered, sort);
    // With a search query, surface the best textual matches first (ignoring the
    // sort dropdown for ranking), then fall back to the chosen sort as the
    // tiebreaker. Stable sort keeps the sorted order within equal-relevance ties.
    if (!deferredFilter.query.trim()) return sorted;
    return [...sorted].sort(
      (a, b) =>
        queryRelevance(b, deferredFilter.query) -
        queryRelevance(a, deferredFilter.query)
    );
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

  // Typo-tolerant fallback for the pure-substring search: when a query returns
  // nothing, suggest the closest family name ("Did you mean Inter?"). Only run
  // the edit-distance scan on the empty state, and skip it when the suggestion
  // would just echo the query.
  const suggestion = useMemo(() => {
    if (results.length > 0 || !hasQuery) return null;
    const s = suggestFamily(filter.query, fonts);
    return s && s.toLowerCase() !== filter.query.trim().toLowerCase()
      ? s
      : null;
  }, [results.length, hasQuery, filter.query, fonts]);

  return (
    <FilterLayout
      rail={<FilterRail active={group} filter={filter} onSelect={setGroup} />}
      sidebar={
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={commitFilter}
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
            <div className="flex items-center gap-2 max-md:w-full">
              <SearchInput
                inputRef={searchRef}
                query={filter.query}
                onQueryChange={(query) => commitFilter({ ...filter, query })}
              />
              {(activeCount > 0 || hasQuery) && (
                <Button
                  variant="outline"
                  onClick={reset}
                  className="h-9 text-destructive"
                >
                  Reset
                  <Kbd>Esc</Kbd>
                </Button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:gap-3">
              <span
                className="flex-1 text-muted-foreground text-sm"
                aria-live="polite"
              >
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
            {/* Surface the search text as a removable chip: it lives in the
                sidebar input, easy to forget as the reason nothing matches. */}
            {filter.query.trim() && (
              <button
                type="button"
                onClick={() => commitFilter({ ...filter, query: "" })}
                className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
                aria-label={`Remove search: ${filter.query.trim()}`}
              >
                <span className="opacity-60">Search</span>
                <span className="text-foreground">{filter.query.trim()}</span>
                <XIcon className="size-3 opacity-60" />
              </button>
            )}
            {/* Typo-tolerant nudge: swap the query for the closest family name. */}
            {suggestion && (
              <p className="text-muted-foreground text-sm">
                Did you mean{" "}
                <button
                  type="button"
                  onClick={() => commitFilter({ ...filter, query: suggestion })}
                  className="font-medium text-foreground underline decoration-muted-foreground/50 hover:decoration-foreground"
                >
                  {suggestion}
                </button>
                ?
              </p>
            )}
            <ActiveFilterChips filter={filter} onChange={commitFilter} />
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
          <>
            <ActiveFilterChips
              filter={filter}
              onChange={commitFilter}
              align="left"
            />
            <FontGrid
              fonts={results}
              previewText={previewText}
              favorites={favorites}
              onToggleFavorite={toggle}
              view={view}
              selection={deferredFilter}
              axisValues={axisValues}
              scrollRef={scrollRef}
            />
          </>
        )}
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
      />
    </FilterLayout>
  );
}

// Placeholder for the list header while the catalog loads. The wrapper classes
// mirror Catalog's real header exactly (search row, then the count/sort/view
// row), because the Column header is flex-wrap: on mobile the real header wraps
// to two rows, so a one-row skeleton would let the header grow the moment the
// catalog resolved and push the whole list down. Each block stands in for the
// control at that position, at its real height (h-9 search, h-8 sort and tabs).
const HEADER_SKELETON = (
  <>
    <div className="flex items-center gap-2 max-md:w-full">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-muted max-md:w-full max-md:min-w-0 max-md:flex-1 xl:w-96" />
    </div>
    <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:w-full max-md:justify-between md:gap-3">
      {/* The real count span is flex-1, so it owns the slack and pushes sort +
          tabs to the right edge; the pulse block inside keeps a text-sized bar
          rather than stretching across that whole slack. */}
      <div className="flex-1">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
    </div>
  </>
);

// Shown while the catalog loader runs (a slow catalog.json fetch). Reuses the app shell,
// rail + empty sidebar + Column header/footer, with a skeleton grid body, so a
// slow load reads as the page filling in rather than a blank or spinner. The
// controls are inert placeholders (no data yet); the real App swaps in on load.
function ListPending() {
  return (
    <FilterLayout sidebar={<div className="size-full" />}>
      <Column
        header={HEADER_SKELETON}
        footer={<PreviewBar />}
      >
        <SkeletonGrid view="grid" />
      </Column>
    </FilterLayout>
  );
}

// Pending state for the DEFAULT `/` view: renders the loader's first-page slice
// as real, non-virtualized FontCards (real <Link> /specimen/ anchors), so a
// crawler or non-JS fetch of `/` sees ~24 actual fonts in the SSR HTML instead
// of an empty shell. Below the real cards sits a skeleton grid, so the panel
// reads as "filling in" until the full catalog resolves and Catalog takes over.
//
// The wrapper classes mirror the virtualized grid's row container (grid gap-4
// pb-4, md:2 lg:3 columns) so nothing jumps on the swap. Favorites hydrate to []
// (useFavorites is SSR-safe), preview text is "" (falls back to each font's
// specimen), and the selection is the empty filter, the exact props Catalog
// passes on a default first render, so server and first-client trees agree.
function FirstPagePending() {
  const { firstPage } = Route.useLoaderData();
  const { text: previewText } = usePreview();
  // Column count must match FontGrid exactly or the layout reflows the moment
  // Catalog takes over. FontGrid measures its CONTAINER (columnsFor), not the
  // viewport, because the filter panel narrows the list well below the viewport
  // breakpoint — at 1440px the list is ~1000px and wants 2 columns, at 1920px
  // it is ~1480px and wants 3.
  //
  // Hence container queries rather than JS: measuring in an effect leaves the
  // first paint showing a guessed count, and any hardcoded guess is wrong at
  // some width (2 reflowed to 3 at 1920px, 3 reflowed to 2 at 1440px). CSS
  // resolves against the real container on the first paint, with no window
  // where the two grids disagree. The breakpoints mirror columnsFor's.

  // No loader slice (build without catalog-first.json, or a fetch failure):
  // fall back to the plain skeleton, unchanged from before this feature.
  if (firstPage.length === 0) return <ListPending />;

  return (
    <FilterLayout sidebar={<div className="size-full" />}>
      <Column
        header={HEADER_SKELETON}
        footer={<PreviewBar />}
      >
        {/* Both layouts are rendered; CSS shows the one matching data-view, so
            the SSR'd list already matches the visitor's saved preference. See
            pending-grid-only / pending-row-only in styles.css. */}
        <div className="pending-grid-only @container flex-1">
          <div className="grid @min-[1024px]:grid-cols-3 @min-[768px]:grid-cols-2 grid-cols-1 gap-4 pb-4">
            {firstPage.map((font) => (
              <FontCard
                key={font.id}
                font={font}
                previewText={previewText}
                isFavorite={false}
                onToggleFavorite={NOOP}
                selection={FIRST_PAGE_SELECTION}
                axisValues={EMPTY_AXES}
              />
            ))}
          </div>
          <SkeletonGrid view="grid" />
        </div>
        <div className="pending-row-only flex-1">
          {firstPage.map((font) => (
            <FontRow
              key={font.id}
              font={font}
              previewText={previewText}
              isFavorite={false}
              onToggleFavorite={NOOP}
              selection={FIRST_PAGE_SELECTION}
              axisValues={EMPTY_AXES}
            />
          ))}
          <SkeletonGrid view="row" />
        </div>
      </Column>
    </FilterLayout>
  );
}

// Stable, module-level props for the first-page cards: an empty selection (no
// active filter), no axis sliders, and a no-op favorite toggle (favorites are
// still hydrating). Module-level so they're referentially stable and FontCard's
// memo bails out cleanly.
const NOOP = () => {};
const EMPTY_AXES: Record<string, number> = {};
const FIRST_PAGE_SELECTION = {
  classes: emptyFilter.classes,
  facets: emptyFilter.facets,
  color: emptyFilter.color,
  axes: emptyFilter.axes,
  weights: emptyFilter.weights,
  widths: emptyFilter.widths,
  italic: emptyFilter.italic,
};

// Local draft state + IME composition guard so typing 注音/拼音 assembles a
// character before it reaches the filter. Committing every keystroke to the URL
// interrupts composition; we only commit once the IME finishes (or on plain
// input for non-IME text).
function SearchInput({
  query,
  onQueryChange,
  inputRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [draft, setDraft] = useState(query);
  const composing = useRef(false);

  // Keep the draft in sync when the query changes from outside (e.g. reset),
  // by comparing against the last-seen prop during render. Not a key-remount:
  // our own commits also round-trip through `query`, and remounting mid-typing
  // would drop focus and break IME composition.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setDraft(query);
  }

  const commit = (value: string) => {
    setDraft(value);
    if (!composing.current) onQueryChange(value);
  };

  return (
    <div className="relative w-72 max-md:w-full max-md:min-w-0 max-md:flex-1 xl:w-96">
      <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
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
        onKeyDown={(e) => {
          // Escape clears the search (matching the "/"-to-focus shortcut), then
          // blurs so a second Escape isn't swallowed.
          if (e.key === "Escape" && draft) {
            e.preventDefault();
            commit("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search family or designer"
        aria-label="Search fonts by family or designer"
        className={cn("h-9 pl-8", !draft && "pr-8")}
      />
      {/* Advertises the "/"-to-focus shortcut. Hidden once the field has text,
          where it would crowd the query and the native clear button. */}
      {!draft && (
        <Kbd className="absolute top-1/2 right-2.5 -translate-y-1/2">/</Kbd>
      )}
    </div>
  );
}
