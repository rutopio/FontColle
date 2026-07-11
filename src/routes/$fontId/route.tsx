import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FilterLayout } from "@/components/filter-layout";
import { deriveFacets } from "@/lib/fonts/facets";
import { DEFAULT_ON } from "@/lib/fonts/features";
import {
  blocksWithCoverage,
  useGlyphCoverage,
} from "@/lib/fonts/glyph-coverage";
import { getFontById, getFontsByDesigners } from "@/lib/fonts/queries";
import { pageTitle } from "@/lib/site";
import { Detail } from "./-components/detail";
import { DetailRail, type DetailTab } from "./-components/detail-rail";
import { DetailSidebar } from "./-components/detail-sidebar";
import { GlyphsSidebar } from "./-components/glyphs-sidebar";

export const Route = createFileRoute("/$fontId")({
  component: DetailPage,
  loader: async ({ params }) => {
    // The detail page needs only the one font, so query it directly rather
    // than loading the whole catalog. Derive its facets (the DB stores raw
    // axes/features, not derived facets) for parity with the list.
    const font = await getFontById({ data: params.fontId });
    if (!font) throw notFound();
    // Other families per credited designer, for the Designer tab. Keyed by name
    // so each designer's bio can list their own siblings. Empty when unknown.
    const names = (font.designer ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const siblingsByDesigner =
      names.length > 0
        ? await getFontsByDesigners({ data: { names, excludeId: font.id } })
        : {};
    return {
      font: { ...font, facets: deriveFacets(font) },
      siblingsByDesigner,
    };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.font.name;
    if (!name) return {};
    const description = `Preview ${name}, browse its weights and OpenType features, and open it on Google Fonts.`;
    return {
      meta: [
        { title: pageTitle(name) },
        { name: "description", content: description },
        { property: "og:title", content: pageTitle(name) },
        { property: "og:description", content: description },
        { name: "twitter:title", content: pageTitle(name) },
        { name: "twitter:description", content: description },
      ],
    };
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
  const { font, siblingsByDesigner } = Route.useLoaderData();

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

  // Which detail view is active. Lives here so the sidebar can host the trigger
  // and the Detail body reacts to it.
  const [tab, setTab] = useState<DetailTab>("sample");

  // Glyphs view: fetch the font's Unicode coverage, and derive the blocks it
  // actually covers. Active block lives here so its sidebar (the block list) and
  // the grid body stay in sync, the same way size/axis state is shared with the
  // Sample sidebar.
  const { ranges, loading: glyphLoading } = useGlyphCoverage(font.id);
  const coveredBlocks = useMemo(() => blocksWithCoverage(ranges), [ranges]);
  const [glyphBlock, setGlyphBlock] = useState("");

  // Once coverage loads (or the font changes), pin the active block to the
  // first covered one unless the current selection is still valid — the font
  // may not cover Basic Latin, so there's no fixed default.
  useEffect(() => {
    if (coveredBlocks.length === 0) return;
    setGlyphBlock((prev) =>
      coveredBlocks.some((c) => c.block.name === prev)
        ? prev
        : coveredBlocks[0].block.name
    );
  }, [coveredBlocks]);

  return (
    <FilterLayout
      // Read-only spec views (Detail/Designer/License) collapse the panel to
      // just the icon rail; Sample needs the tester controls and Glyphs needs
      // the block list, so both keep the sidebar open.
      panelOpen={tab === "sample" || tab === "glyphs"}
      rail={<DetailRail active={tab} onSelect={setTab} />}
      sidebar={
        tab === "glyphs" ? (
          <GlyphsSidebar
            blocks={coveredBlocks}
            loading={glyphLoading}
            active={glyphBlock}
            onSelect={setGlyphBlock}
          />
        ) : (
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
        )
      }
    >
      <Detail
        font={font}
        tab={tab}
        siblingsByDesigner={siblingsByDesigner}
        size={size}
        axisState={axisState}
        italic={italic}
        onLoadInstance={loadInstance}
        featureState={featureState}
        glyphBlock={glyphBlock}
        glyphRanges={ranges}
        glyphLoading={glyphLoading}
      />
    </FilterLayout>
  );
}
