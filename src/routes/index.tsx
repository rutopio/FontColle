import { Rows, SquaresFour } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilterSidebar } from "@/components/filter-sidebar";
import { FontGrid, type ViewMode } from "@/components/font-grid";
import { Input } from "@/components/ui/input";
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
  const [previewText, setPreviewText] = useState("");
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
    <div className="container flex min-h-svh flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl">Font Finder</h1>
        <p className="text-muted-foreground text-sm">
          Filter Google Fonts by real OpenType features and variable axes.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Type to preview across all fonts…"
          className="sm:max-w-md"
        />
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

        <div className="flex items-center gap-1 sm:ml-auto">
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
