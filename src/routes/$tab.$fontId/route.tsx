import { SlidersHorizontalIcon, SquaresFourIcon } from "@phosphor-icons/react";
import {
  createFileRoute,
  notFound,
  redirect,
  useCanGoBack,
  useRouter,
} from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FilterLayout } from "@/components/filter-layout";
import { NotFound } from "@/components/not-found";
import { fetchFontById, fetchFontsByDesigners } from "@/lib/fonts/detail";
import { DEFAULT_ON } from "@/lib/fonts/features";
import {
  blocksWithCoverage,
  useGlyphCoverage,
} from "@/lib/fonts/glyph-coverage";
import { fontSlug } from "@/lib/fonts/slug";
import type { FontRecord } from "@/lib/fonts/types";
import { blockOf, parseGlyphQuery } from "@/lib/fonts/unicode-blocks";
import { absoluteUrl, pageTitle } from "@/lib/site";
import { BlockAxesProvider } from "@/lib/tester/block-axes";
import { backWithViewTransition } from "@/lib/view-transition";
import { ControlsDrawer } from "./-components/controls-drawer";
import { Detail } from "./-components/detail";
import { DetailHeader } from "./-components/detail-header";
import {
  DetailRail,
  type DetailTab,
  slugFromTab,
  tabFromSlug,
} from "./-components/detail-rail";
import { DetailSidebar } from "./-components/detail-sidebar";
import { GlyphsSidebar } from "./-components/glyphs-sidebar";

function detailDescription(font: FontRecord): string {
  const name = font.name;
  const rawKind =
    font.category?.trim() ||
    font.apiCategory?.replace(/_/g, " ").toLowerCase() ||
    "";
  const kind = rawKind.toLowerCase();
  const article = /^[aeiou]/.test(kind) ? "an" : "a";
  const lead = kind ? `${name}, ${article} ${kind} font` : name;

  const by = font.designer?.trim() ? ` by ${font.designer.trim()}` : "";

  const parts: string[] = [];
  const axisCount = font.isVariable ? font.axes.length : 0;
  if (axisCount > 0) {
    parts.push(`${axisCount} variable ${axisCount === 1 ? "axis" : "axes"}`);
  }
  const featureCount = font.features.length;
  if (featureCount > 0) {
    parts.push(
      `${featureCount} OpenType ${featureCount === 1 ? "feature" : "features"}`
    );
  }
  const specs = parts.length ? ` with ${parts.join(" and ")}` : "";

  return `Preview ${lead}${by}${specs}. Test every variants and OpenType feature in FontColle.`;
}

export const Route = createFileRoute("/$tab/$fontId")({
  component: DetailPage,
  beforeLoad: ({ params }) => {
    if (params.tab === "about") {
      throw redirect({
        to: "/$tab/$fontId",
        params: { tab: "designer", fontId: params.fontId },
        replace: true,
        statusCode: 301,
      });
    }
  },
  loader: async ({ params }) => {
    if (!tabFromSlug(params.tab)) throw notFound();
    const font = await fetchFontById(params.fontId);
    if (!font) throw notFound();
    const names = (font.designer ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const siblingsByDesigner =
      names.length > 0 ? await fetchFontsByDesigners(names, font.id) : {};
    return { font, siblingsByDesigner };
  },
  head: ({ loaderData, params }) => {
    const font = loaderData?.font;
    const name = font?.name;
    if (!name || !font) return {};
    const description = detailDescription(font);
    // Each tab is its own canonical URL (not all pointed at /instances/).
    const canonical = absoluteUrl(`/${params.tab}/${fontSlug(font.id)}`);
    const ogImage = absoluteUrl(`/og/${font.id}.png`);
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
              { property: "og:image:alt", content: `${name} font specimen` },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
              { name: "twitter:image", content: ogImage },
            ]
          : []),
        { name: "twitter:title", content: pageTitle(name) },
        { name: "twitter:description", content: description },
      ],
      links: canonical ? [{ rel: "canonical", href: canonical }] : [],
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
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const w3cDefaults = () =>
    Object.fromEntries(font.features.map((tag) => [tag, DEFAULT_ON.has(tag)]));
  const [featureState, setFeatureState] =
    useState<Record<string, boolean>>(w3cDefaults);
  const toggleFeature = (tag: string) =>
    setFeatureState((p) => ({ ...p, [tag]: !p[tag] }));
  const resetFeatures = () => setFeatureState(w3cDefaults());

  const axisDefaults = () =>
    Object.fromEntries(font.axes.map((a) => [a.tag, a.default ?? a.min ?? 0]));
  const [axisState, setAxisState] =
    useState<Record<string, number>>(axisDefaults);
  const setAxis = (tag: string, value: number) =>
    setAxisState((prev) => ({ ...prev, [tag]: value }));
  const resetAxes = () => setAxisState(axisDefaults());
  const italic = false;
  const [size, setSize] = useState(24);

  const tab = tabFromSlug(tabSlug) ?? "sample";
  const selectTab = (id: DetailTab) =>
    navigate({
      params: { tab: slugFromTab(id), fontId: fontSlug(font.id) },
      replace: true,
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable
      )
        return;
      if (document.querySelector("[data-slot=sheet-content], [role=dialog]"))
        return;
      if (canGoBack) backWithViewTransition(() => router.history.back());
      else navigate({ to: "/", viewTransition: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate, router, canGoBack]);

  const { ranges, loading: glyphLoading } = useGlyphCoverage(font.id);
  const coveredBlocks = useMemo(() => blocksWithCoverage(ranges), [ranges]);
  const [glyphBlock, setGlyphBlock] = useState("");
  const [highlightCp, setHighlightCp] = useState<number | null>(null);
  const [searchMiss, setSearchMiss] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchGlyph = (query: string): boolean => {
    const cp = parseGlyphQuery(query);
    const block = cp == null ? undefined : blockOf(cp);
    const covered =
      cp != null &&
      block &&
      coveredBlocks.some((c) => c.block.name === block.name);
    if (!covered || cp == null || !block) {
      setSearchMiss(true);
      return false;
    }
    setSearchMiss(false);
    setGlyphBlock(block.name);
    setHighlightCp(cp);
    // WCAG 2.2.2: auto-retire the highlight after 3s.
    clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightCp(null), 3000);
    return true;
  };

  const selectGlyphBlock = (name: string) => {
    setGlyphBlock(name);
    setHighlightCp(null);
    setSearchMiss(false);
  };

  const activeGlyphBlock = coveredBlocks.some(
    (c) => c.block.name === glyphBlock
  )
    ? glyphBlock
    : (coveredBlocks[0]?.block.name ?? "");

  const hasControls = tab === "tester" || tab === "sample" || tab === "glyphs";
  const renderSidebarPanel = (onDismiss?: () => void) =>
    tab === "glyphs" ? (
      <GlyphsSidebar
        blocks={coveredBlocks}
        loading={glyphLoading}
        active={activeGlyphBlock}
        onSelect={selectGlyphBlock}
        onSearch={searchGlyph}
        searchMiss={searchMiss}
        onDismiss={onDismiss}
      />
    ) : (
      <DetailSidebar
        panelKey={tab}
        size={size}
        onSizeChange={setSize}
        showSize={tab === "sample"}
        axes={font.axes}
        axisState={axisState}
        onAxisChange={setAxis}
        onResetAxes={resetAxes}
        showAxes={tab !== "sample"}
        features={font.features}
        featureState={featureState}
        onToggleFeature={toggleFeature}
        onResetFeatures={resetFeatures}
      />
    );

  // JSON-LD describes the family, not the active tab view.
  const familyUrl = absoluteUrl(`/instances/${fontSlug(font.id)}`);
  const jsonLd = familyUrl
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: font.displayName ?? font.name,
        url: familyUrl,
        ...(font.designer ? { creator: font.designer } : {}),
        ...(font.license ? { license: font.license } : {}),
      })
    : undefined;

  const withBlockAxes = (node: React.ReactNode) =>
    tab === "tester" ? <BlockAxesProvider>{node}</BlockAxesProvider> : node;

  return withBlockAxes(
    <FilterLayout
      favoriteFontId={font.id}
      rail={<DetailRail active={tab} onSelect={selectTab} />}
      sidebar={hasControls ? renderSidebarPanel() : null}
      header={<DetailHeader font={font} />}
    >
      {jsonLd ? (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify output of catalog data, not user input; a script tag's contents cannot be set any other way.
          dangerouslySetInnerHTML={{ __html: jsonLd }}
          type="application/ld+json"
        />
      ) : null}
      <Detail
        font={font}
        tab={tab}
        siblingsByDesigner={siblingsByDesigner}
        size={size}
        axisState={axisState}
        italic={italic}
        featureState={featureState}
        glyphBlock={activeGlyphBlock}
        glyphRanges={ranges}
        glyphLoading={glyphLoading}
        glyphHighlightCp={highlightCp}
      />
      <AnimatePresence initial={false}>
        {hasControls && (
          <ControlsDrawer
            title={tab === "glyphs" ? "Unicode blocks" : "Preview controls"}
            icon={tab === "glyphs" ? SquaresFourIcon : SlidersHorizontalIcon}
            dockVisible={tab === "sample"}
          >
            {(close) => renderSidebarPanel(close)}
          </ControlsDrawer>
        )}
      </AnimatePresence>
    </FilterLayout>
  );
}
