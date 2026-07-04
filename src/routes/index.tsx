import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilterSidebar } from "@/components/filter-sidebar";
import { FontCard } from "@/components/font-card";
import { Input } from "@/components/ui/input";
import fontsData from "@/data/fonts.json";
import { useFavorites } from "@/lib/fonts/favorites";
import { applyFilters, buildFacetIndex, emptyFilter } from "@/lib/fonts/filter";
import type { FontRecord } from "@/lib/fonts/types";

const fonts = fontsData as FontRecord[];

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [filter, setFilter] = useState(emptyFilter);
  const [previewText, setPreviewText] = useState("");
  const { favorites, toggle } = useFavorites();

  const index = useMemo(() => buildFacetIndex(fonts), [fonts]);
  const results = useMemo(() => applyFilters(fonts, filter), [fonts, filter]);

  const activeCount =
    filter.classes.length +
    filter.facets.length +
    filter.features.length +
    filter.axes.length;

  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col gap-6 p-6">
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
              onClick={() => setFilter(emptyFilter)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Clear {activeCount} filters
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <FilterSidebar index={index} filter={filter} onChange={setFilter} />

        <main className="grid flex-1 grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((font) => (
            <FontCard
              key={font.id}
              font={font}
              previewText={previewText}
              isFavorite={favorites.includes(font.id)}
              onToggleFavorite={toggle}
            />
          ))}
          {results.length === 0 && (
            <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
              No fonts match these filters.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
