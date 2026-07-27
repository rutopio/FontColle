import { SlidersHorizontalIcon, SquaresFourIcon } from "@phosphor-icons/react";
import {
  createFileRoute,
  notFound,
  redirect,
  useCanGoBack,
  useRouter,
} from "@tanstack/react-router";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
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

// Every clause is optional, so a sparse record still reads naturally. Kept
// under ~160 chars, the length search engines show.
function detailDescription(font: FontRecord): string {
  const name = font.name;
  // apiCategory is the raw GF enum ("SANS_SERIF"), hence the despacing.
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
    // /about/{fontId} is the Designer tab's retired slug; 301 it rather than
    // let the unknown-slug check below 404.
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
    // Reject unknown slugs, so /foo/roboto 404s instead of silently falling
    // back to a default view.
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
  head: ({ loaderData }) => {
    const font = loaderData?.font;
    const name = font?.name;
    if (!name || !font) return {};
    const description = detailDescription(font);
    // The six tabs render near-identical content on overlapping URLs, so every
    // canonical points at Instances to consolidate ranking signals.
    const canonical = absoluteUrl(`/instances/${fontSlug(font.id)}`);
    // Pre-rendered by `pnpm gen:og`. Needs an absolute URL, like og:url.
    const ogImage = absoluteUrl(`/og/${font.id}.png`);
    // Structured data is NOT emitted here: in this version neither head()'s
    // `scripts` nor `headScripts` puts a ld+json tag in the SSR document,
    // verified against production both ways. DetailPage renders it in its own
    // JSX instead, and Google accepts JSON-LD anywhere in the document.
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

  // Default-on features seed as ON, matching what the browser renders.
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
  // Nothing flips this: the Tester's chips set italic per block on the node
  // itself, so this stays the family's upright default.
  const italic = false;

  // Only the Instances rows read this: the Tester sizes per block type in its
  // own toolbar.
  const [size, setSize] = useState(24);

  // `replace` so switching tabs doesn't push history: back should return to
  // the list, not step through the tabs visited on this font.
  const tab = tabFromSlug(tabSlug) ?? "sample";
  const selectTab = (id: DetailTab) =>
    navigate({
      params: { tab: slugFromTab(id), fontId: fontSlug(font.id) },
      replace: true,
    });

  // Skipped while typing, and while a dialog or drawer is open, where Escape
  // means "close that" instead.
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
      // Same rule as Back: step back if we came from the list, so its filters
      // and scroll survive; otherwise go there fresh.
      if (canGoBack) router.history.back();
      else navigate({ to: "/" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate, router, canGoBack]);

  const { ranges, loading: glyphLoading } = useGlyphCoverage(font.id);
  const coveredBlocks = useMemo(() => blocksWithCoverage(ranges), [ranges]);
  const [glyphBlock, setGlyphBlock] = useState("");
  // Cleared on manual block selection, so a later search for the same block
  // re-triggers the highlight.
  const [highlightCp, setHighlightCp] = useState<number | null>(null);
  const [searchMiss, setSearchMiss] = useState(false);

  // The highlight is an infinite animate-pulse, and auto-playing motion running
  // past five seconds with no way to stop it fails WCAG 2.2.2, so retire it on
  // a timer. Long enough to survive the scroll-into-view and be found by eye.
  useEffect(() => {
    if (highlightCp == null) return;
    const id = setTimeout(() => setHighlightCp(null), 3000);
    return () => clearTimeout(id);
  }, [highlightCp]);

  // Returns whether it landed, so the mobile drawer closes on a hit and a miss
  // stays open to show the field's error.
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
    return true;
  };

  const selectGlyphBlock = (name: string) => {
    setGlyphBlock(name);
    setHighlightCp(null);
    setSearchMiss(false);
  };

  // No fixed default: a font may not cover Basic Latin. Derived rather than
  // effect-corrected, so a font change never renders a stale pick.
  const activeGlyphBlock = coveredBlocks.some(
    (c) => c.block.name === glyphBlock
  )
    ? glyphBlock
    : (coveredBlocks[0]?.block.name ?? "");

  // Rendered in both the desktop sidebar and the mobile drawer. `onDismiss`
  // comes only from the drawer, the one host that can be closed.
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
        // Opposite halves: the Tester sizes per block in its own toolbar but
        // reweights from the axis sliders, while Instances pins each row to
        // its own coords and needs only the shared size.
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
  const sidebarPanel = hasControls ? renderSidebarPanel() : null;

  // Rendered here rather than through head(), which emits nothing in the SSR
  // document (see the note there).
  const canonicalUrl = absoluteUrl(`/instances/${fontSlug(font.id)}`);
  const jsonLd = canonicalUrl
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: font.displayName ?? font.name,
        url: canonicalUrl,
        ...(font.designer ? { creator: font.designer } : {}),
        ...(font.license ? { license: font.license } : {}),
      })
    : undefined;

  return (
    <FilterLayout
      panelOpen={hasControls}
      favoriteFontId={font.id}
      rail={<DetailRail active={tab} onSelect={selectTab} />}
      sidebar={sidebarPanel}
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
      {/* Mobile-only controls access for the tabs that have a sidebar.
          AnimatePresence keeps the FAB mounted through its exit animation when
          switching to a tab without controls. No per-tab key: Tester,
          Instances and Glyphs all keep the FAB, so it stays put and only swaps
          its icon rather than cross-fading two buttons in the same spot. */}
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
