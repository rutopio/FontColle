import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { FilterLayout } from "@/components/filter-layout";
import { withFacets } from "@/lib/fonts/facets";
import { DEFAULT_ON } from "@/lib/fonts/features";
import { getAllFonts } from "@/lib/fonts/queries";
import { Detail } from "./-components/detail";
import { DetailSidebar } from "./-components/detail-sidebar";

export const Route = createFileRoute("/$fontId")({
  component: DetailPage,
  loader: async ({ params }) => {
    // The detail page needs only the one font; its sidebar shows that font's
    // OpenType features, not the catalog-wide filter facets.
    const all = withFacets(await getAllFonts());
    const font = all.find((f) => f.id === params.fontId);
    if (!font) throw notFound();
    return { font };
  },
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-(--breakpoint-2xl) p-6">
      <Link
        to="/"
        className="text-muted-foreground text-sm hover:text-foreground"
      >
        ← All fonts
      </Link>
      <p className="py-16 text-center text-muted-foreground">Font not found.</p>
    </div>
  ),
});

function DetailPage() {
  const { font } = Route.useLoaderData();

  // Feature/axis state live at the page level so the sidebar controls and the
  // type tester share one source of truth. The W3C default state seeds default-on
  // features as ON so the UI matches what the browser renders (todo §8b).
  const w3cDefaults = () =>
    Object.fromEntries(font.features.map((tag) => [tag, DEFAULT_ON.has(tag)]));
  const [featureState, setFeatureState] =
    useState<Record<string, boolean>>(w3cDefaults);
  const toggleFeature = (tag: string) =>
    setFeatureState((p) => ({ ...p, [tag]: !p[tag] }));
  const resetFeatures = () => setFeatureState(w3cDefaults());

  // Axis state: tag -> current value, seeded from each axis default.
  const axisDefaults = () =>
    Object.fromEntries(font.axes.map((a) => [a.tag, a.default ?? a.min ?? 0]));
  const [axisState, setAxisState] =
    useState<Record<string, number>>(axisDefaults);
  const setAxis = (tag: string, value: number) =>
    setAxisState((prev) => ({ ...prev, [tag]: value }));
  const resetAxes = () => setAxisState(axisDefaults());
  // Whether the tester currently renders an italic style. Set when an italic
  // named instance is loaded; cleared for an upright one. Drives font-style.
  const [italic, setItalic] = useState(false);
  const loadInstance = (coords: Record<string, number>, isItalic = false) => {
    setAxisState((prev) => ({ ...prev, ...coords }));
    setItalic(isItalic);
  };

  // Preview font size lives here too, since its control is in the sidebar.
  const [size, setSize] = useState(72);

  return (
    <FilterLayout
      sidebar={
        <DetailSidebar
          size={size}
          onSizeChange={setSize}
          axes={font.axes}
          axisState={axisState}
          onAxisChange={setAxis}
          onResetAxes={resetAxes}
          features={font.features}
          featureState={featureState}
          onToggleFeature={toggleFeature}
          onResetFeatures={resetFeatures}
        />
      }
    >
      <Detail
        font={font}
        size={size}
        axisState={axisState}
        italic={italic}
        onLoadInstance={loadInstance}
        featureState={featureState}
      />
    </FilterLayout>
  );
}
