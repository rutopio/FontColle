import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FilterLayout } from "@/components/filter-layout";
import { NotFound } from "@/components/not-found";
import { deriveFacets } from "@/lib/fonts/facets";
import { DEFAULT_ON } from "@/lib/fonts/features";
import {
  blocksWithCoverage,
  useGlyphCoverage,
} from "@/lib/fonts/glyph-coverage";
import { getFontById, getFontsByDesigners } from "@/lib/fonts/queries";
import { fontSlug } from "@/lib/fonts/slug";
import { blockOf, parseGlyphQuery } from "@/lib/fonts/unicode-blocks";
import { absoluteUrl, pageTitle } from "@/lib/site";
import { ControlsDrawer } from "./-components/controls-drawer";
import { Detail } from "./-components/detail";
import {
  DetailRail,
  type DetailTab,
  slugFromTab,
  tabFromSlug,
} from "./-components/detail-rail";
import { DetailSidebar } from "./-components/detail-sidebar";
import { GlyphsSidebar } from "./-components/glyphs-sidebar";

export const Route = createFileRoute("/$tab/$fontId")({
  component: DetailPage,
  loader: async ({ params }) => {
    // The tab is a URL segment; reject unknown slugs so /foo/roboto 404s
    // instead of silently falling back to a default view.
    if (!tabFromSlug(params.tab)) throw notFound();
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
    const font = loaderData?.font;
    const name = font?.name;
    if (!name || !font) return {};
    const description = `Preview ${name}, browse its weights and OpenType features, and open it on Google Fonts.`;
    // The six tabs render near-identical content on overlapping URLs, so point
    // every tab's canonical at the specimen tab to consolidate ranking signals.
    const canonical = absoluteUrl(`/specimen/${fontSlug(font.id)}`);
    // Per-font share card: the family name set in its own typeface, pre-rendered
    // to public/og/<id>.png by `pnpm gen:og`. Needs an absolute URL like og:url.
    const ogImage = absoluteUrl(`/og/${font.id}.png`);
    // Structured data for the family, so search engines can surface designer +
    // license. Only emitted with an absolute origin (needs a real URL).
    const jsonLd = canonical
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name,
          url: canonical,
          ...(font.designer ? { creator: font.designer } : {}),
          ...(font.license ? { license: font.license } : {}),
        })
      : undefined;
    return {
      meta: [
        { title: pageTitle(name) },
        { name: "description", content: description },
        { property: "og:title", content: pageTitle(name) },
        { property: "og:description", content: description },
        ...(canonical ? [{ property: "og:url", content: canonical }] : []),
        ...(ogImage
          ? [
              { property: "og:image", content: ogImage },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { name: "twitter:image", content: ogImage },
            ]
          : []),
        { name: "twitter:title", content: pageTitle(name) },
        { name: "twitter:description", content: description },
      ],
      links: canonical ? [{ rel: "canonical", href: canonical }] : [],
      scripts: jsonLd
        ? [{ type: "application/ld+json", children: jsonLd }]
        : [],
    };
  },
  notFoundComponent: () => (
    <NotFound
      title="Font not found"
      description={[
        "This font family isn't in the catalog.",
        "It may have been renamed or removed.",
      ]}
    />
  ),
});

function DetailPage() {
  const { font, siblingsByDesigner } = Route.useLoaderData();
  const { tab: tabSlug } = Route.useParams();
  const navigate = Route.useNavigate();

  // Feature/axis state live at the page level so the sidebar controls and the
  // type tester share one source of truth. The W3C default state seeds default-on
  // features as ON so the UI matches what the browser renders.
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

  // Which detail view is active. Driven by the URL slug (the loader has already
  // rejected unknown ones), so the tab is shareable/bookmarkable. Selecting a
  // tab navigates to its slug rather than holding local state. `replace` so
  // switching tabs doesn't push history entries — the back arrow should return
  // to the list, not step through the tabs visited on this font.
  const tab = tabFromSlug(tabSlug) ?? "sample";
  const selectTab = (id: DetailTab) =>
    navigate({
      params: { tab: slugFromTab(id), fontId: fontSlug(font.id) },
      replace: true,
    });

  // Glyphs view: fetch the font's Unicode coverage, and derive the blocks it
  // actually covers. Active block lives here so its sidebar (the block list) and
  // the grid body stay in sync, the same way size/axis state is shared with the
  // Sample sidebar.
  const { ranges, loading: glyphLoading } = useGlyphCoverage(font.id);
  const coveredBlocks = useMemo(() => blocksWithCoverage(ranges), [ranges]);
  const [glyphBlock, setGlyphBlock] = useState("");
  // A codepoint to scroll to and briefly highlight in the grid, set by the
  // sidebar's glyph search. Cleared on manual block selection so a later search
  // for the same block re-triggers the highlight.
  const [highlightCp, setHighlightCp] = useState<number | null>(null);
  const [searchMiss, setSearchMiss] = useState(false);

  // Resolve a glyph-search query (a character or "U+XXXX") to a covered block +
  // codepoint. Miss = not a BMP codepoint, or the font doesn't cover it.
  const searchGlyph = (query: string) => {
    const cp = parseGlyphQuery(query);
    const block = cp == null ? undefined : blockOf(cp);
    const covered =
      cp != null &&
      block &&
      coveredBlocks.some((c) => c.block.name === block.name);
    if (!covered || cp == null || !block) {
      setSearchMiss(true);
      return;
    }
    setSearchMiss(false);
    setGlyphBlock(block.name);
    setHighlightCp(cp);
  };

  const selectGlyphBlock = (name: string) => {
    setGlyphBlock(name);
    setHighlightCp(null);
    setSearchMiss(false);
  };

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

  // The Specimen/Glyphs sidebar panel. Built once and reused by both the desktop
  // sidebar slot and the mobile ControlsDrawer, so the two stay in sync (state
  // lives here on the page, above both). Only these two tabs have controls.
  const hasControls = tab === "sample" || tab === "glyphs";
  const sidebarPanel = hasControls ? (
    tab === "glyphs" ? (
      <GlyphsSidebar
        blocks={coveredBlocks}
        loading={glyphLoading}
        active={glyphBlock}
        onSelect={selectGlyphBlock}
        onSearch={searchGlyph}
        searchMiss={searchMiss}
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
  ) : null;

  return (
    <FilterLayout
      // Read-only spec views (Detail/Designer/License) collapse the panel to
      // just the icon rail; Sample needs the tester controls and Glyphs needs
      // the block list, so both keep the sidebar open.
      panelOpen={hasControls}
      // The footer Favorite button hearts this font (vs. the list's fav view).
      favoriteFontId={font.id}
      rail={<DetailRail active={tab} onSelect={selectTab} />}
      sidebar={sidebarPanel}
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
        glyphHighlightCp={highlightCp}
      />
      {/* Mobile-only controls access for the two tabs that have a sidebar. */}
      {hasControls && (
        <ControlsDrawer
          title={tab === "glyphs" ? "Unicode blocks" : "Preview controls"}
        >
          {sidebarPanel}
        </ControlsDrawer>
      )}
    </FilterLayout>
  );
}
