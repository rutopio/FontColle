import { Rows, SquaresFour } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { FilterSidebar } from "@/components/filter-sidebar";
import { FontGrid, type ViewMode } from "@/components/font-grid";
import { SiteHeader } from "@/components/site-header";
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
import { usePreview } from "@/lib/preview/context";
import { cn } from "@/lib/utils";

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

  const facetIndex = useMemo(() => buildFacetIndex(fonts), [fonts]);
  const filter = useMemo(() => searchToFilter(search), [search]);
  const results = useMemo(() => applyFilters(fonts, filter), [fonts, filter]);
  const view: ViewMode = search.view === "row" ? "row" : "grid";

  // Preserve the view preference across filter changes (view isn't a filter).
  const setFilter = (next: FilterState) => {
    navigate({
      search: { ...filterToSearch(next), view: search.view },
      replace: true,
    });
  };

  const setView = (next: ViewMode) => {
    navigate({
      search: {
        ...filterToSearch(filter),
        view: next === "row" ? "row" : undefined,
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
    <div className="container flex min-h-svh flex-col gap-6 p-6 pb-24">
      <SiteHeader />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <span>{results.length} fonts</span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() =>
                navigate({ search: { view: search.view }, replace: true })
              }
              className="underline underline-offset-2 hover:text-foreground"
            >
              Clear {activeCount} filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <ViewToggle
            active={view === "grid"}
            label="Grid view"
            onClick={() => setView("grid")}
          >
            <SquaresFour className="size-4" />
          </ViewToggle>
          <ViewToggle
            active={view === "row"}
            label="Row view"
            onClick={() => setView("row")}
          >
            <Rows className="size-4" />
          </ViewToggle>
        </div>
      </div>

      <div className="flex gap-6">
        <FilterSidebar
          index={facetIndex}
          filter={filter}
          onChange={setFilter}
        />

        <main className="min-w-0 flex-1">
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
        </main>
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-md border p-1.5 transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "text-muted-foreground hover:border-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
