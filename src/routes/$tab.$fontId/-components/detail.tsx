import { SlidersHorizontalIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import type * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import { Column } from "@/components/filter-layout";
import { PreviewBar } from "@/components/preview-dock";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { DesignerSibling } from "@/lib/fonts/detail";
import { buildFeatureSettings } from "@/lib/fonts/features";
import type { CoveredBlock } from "@/lib/fonts/glyph-coverage";
import { scriptLabel } from "@/lib/fonts/labels";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import { fontSlug } from "@/lib/fonts/slug";
import { specimenFor, specimenLinesFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { BlockPicker } from "./block-picker";
import { ControlsDrawer } from "./controls-drawer";
import { DesignerPanel } from "./designer-panel";
import { type DetailTab, DetailTabBar } from "./detail-rail";
import { GlyphsPanel } from "./glyphs";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { LicensePanel } from "./license-panel";
import { LinksDrawer } from "./links-drawer";
import { MetricsPanel } from "./metrics-panel";
import { Panel } from "./panel";
import { PreviewControls } from "./preview-controls";
import { type SpecRow, SpecTable } from "./spec-table";
import { Tester } from "./tester";
import { UsePanel } from "./use";

export function Detail({
  font,
  tab,
  siblingsByDesigner,
  size,
  onSizeChange,
  axisState,
  onAxisChange,
  onResetAxes,
  italic,
  featureState,
  onToggleFeature,
  onResetFeatures,
  glyphBlocks,
  glyphBlock,
  onSelectGlyphBlock,
  onSearchGlyph,
  glyphSearchMiss,
  glyphRanges,
  glyphLoading,
  glyphHighlightCp,
}: {
  font: FontRecord;
  tab: DetailTab;
  siblingsByDesigner: Record<string, DesignerSibling[]>;
  size: number;
  onSizeChange: (value: number) => void;
  axisState: Record<string, number>;
  onAxisChange: (tag: string, value: number) => void;
  onResetAxes: () => void;
  italic: boolean;
  featureState: Record<string, boolean>;
  onToggleFeature: (tag: string) => void;
  onResetFeatures: () => void;
  glyphBlocks: CoveredBlock[];
  glyphBlock: string;
  onSelectGlyphBlock: (name: string) => void;
  // Returns whether the query resolved to a covered glyph.
  onSearchGlyph: (query: string) => boolean;
  glyphSearchMiss: boolean;
  glyphRanges: [number, number][];
  glyphLoading: boolean;
  glyphHighlightCp: number | null;
}) {
  const { text, setText } = usePreview();
  // Detail-only: absent from the shared list catalog. See DETAIL_ONLY_FIELDS
  // in scripts/gen-catalog.mjs.
  const versionHistory = font.versionHistory ?? [];
  const specimen = text || specimenFor(font);
  // Deliberately NOT the shared preview sentence: the editor owns its text
  // once mounted, so borrowing it would make the two look linked when only the
  // first render ever reads it.
  const seedLines = specimenLinesFor(font);
  // Shared with the Glyphs grid, whose row-virtualizer binds to it.
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasItalic = useMemo(
    () => font.instances.some((i) => i.italic),
    [font.instances]
  );

  useEffect(() => {
    ensureFontRangeLoaded(font.name, font.axes, hasItalic);
  }, [font.name, font.axes, hasItalic]);

  const fontLoaded = useFontLoaded(font.name);

  const subsets = font.subsets.filter((s) => s !== "menu");

  // "Last updated" deliberately carries no version badge: the git-tag history
  // lags the font's own version, so the two would disagree.
  const specRows: SpecRow[] = [
    { label: "Variable", value: font.isVariable ? "Yes" : "No" },
    { label: "Axes", value: String(font.axes.length) },
    { label: "Named instances", value: String(font.instances.length) },
    { label: "OpenType features", value: String(font.features.length) },
    font.unitsPerEm != null && {
      label: "Units per em",
      value: font.unitsPerEm.toLocaleString(),
    },
    font.glyphCount != null && {
      label: "Glyphs",
      value: font.glyphCount.toLocaleString(),
    },
    font.charCount != null && {
      label: "Characters",
      value: font.charCount.toLocaleString(),
    },
    font.version != null && { label: "Version", value: String(font.version) },
    font.dateAdded && {
      label: "Added",
      value: formatDate(font.dateAdded),
      badge: versionOnDate(versionHistory, font.dateAdded) ?? undefined,
    },
    // Both shown deliberately: Google's publish date moves on any release,
    // while head.modified moves only when the outlines are rebuilt. The
    // Maintenance filter buckets on the latter.
    font.lastModifiedApi && {
      label: "Published",
      value: formatDate(font.lastModifiedApi),
    },
    font.modifiedMs != null &&
      font.modifiedMs > 0 && {
        label: "Font built",
        value: formatDate(new Date(font.modifiedMs).toISOString().slice(0, 10)),
      },
    font.license && { label: "License", value: font.license },
  ].filter(Boolean) as SpecRow[];

  // Shared by every preview surface, so one toggle reads the same everywhere.
  const featureSettings = useMemo(
    () => buildFeatureSettings(featureState),
    [featureState]
  );

  const hasControls = tab === "tester" || tab === "sample" || tab === "glyphs";

  // Rendered twice: in the body's controls column and, below lg, in the FAB
  // drawer. `onDismiss` comes only from the drawer, the one host that closes.
  const renderControls = (onDismiss?: () => void) =>
    tab === "glyphs" ? (
      <BlockPicker
        blocks={glyphBlocks}
        loading={glyphLoading}
        active={glyphBlock}
        onSelect={onSelectGlyphBlock}
        onSearch={onSearchGlyph}
        searchMiss={glyphSearchMiss}
        onDismiss={onDismiss}
      />
    ) : (
      <PreviewControls
        panelKey={tab}
        size={size}
        onSizeChange={onSizeChange}
        // Opposite halves: the Tester sizes per block in its own toolbar but
        // reweights from the axis sliders, while Instances pins each row to its
        // own coords and needs only the shared size.
        showSize={tab === "sample"}
        axes={font.axes}
        axisState={axisState}
        onAxisChange={onAxisChange}
        onResetAxes={onResetAxes}
        showAxes={tab !== "sample"}
        features={font.features}
        featureState={featureState}
        onToggleFeature={onToggleFeature}
        onResetFeatures={onResetFeatures}
      />
    );

  // Instances often pin a dozen axes at one shared value (Roboto Flex names 13
  // but varies only wght and slnt), and a badge repeating that number on every
  // row carries no information.
  const varyingAxisTags = useMemo(() => {
    const seen = new Map<string, number>();
    const varying = new Set<string>();
    for (const inst of font.instances) {
      for (const [tag, value] of Object.entries(inst.coords)) {
        if (!seen.has(tag)) {
          seen.set(tag, value);
          if (inst !== font.instances[0]) varying.add(tag);
        } else if (seen.get(tag) !== value) {
          varying.add(tag);
        }
      }
      for (const tag of seen.keys()) {
        if (!(tag in inst.coords)) varying.add(tag);
      }
    }
    return varying;
  }, [font.instances]);

  // No font-size: the editor sets that per block type itself.
  const testerFontStyle: React.CSSProperties = useMemo(() => {
    const coords = Object.fromEntries(
      font.axes.map((a) => [a.tag, axisState[a.tag]])
    );
    return {
      ...previewStyle({ name: font.name, loaded: fontLoaded, coords, italic }),
      fontFeatureSettings: featureSettings,
    };
  }, [font.name, font.axes, axisState, italic, featureSettings, fontLoaded]);

  return (
    <Column
      scrollViewportRef={scrollRef}
      subheader={<DetailTabBar active={tab} fontId={fontSlug(font.id)} />}
      footer={<PreviewBar />}
      // Instances only: the Tester seeds its document once and then owns it,
      // so a live field there would look like it still edits.
      footerHidden={tab !== "sample"}
      // The controls sit where the sidebar used to, but inside the page rather
      // than in the layout's sidebar slot, so switching to a tab without them
      // doesn't animate the whole shell open and shut. Its own scroller, and a
      // sibling of the body's, so neither column drags the other. Below lg
      // there is no room for it and the FAB drawer takes over.
      //
      // w-100 is 25rem, the width the retired sidebar carried: the same
      // controls, so a narrower column would only reflow every axis row and
      // feature toggle to no purpose.
      aside={
        hasControls ? (
          <aside className="hidden w-100 shrink-0 border-border border-r lg:block">
            <ScrollArea className="h-full">
              <div className="p-6">{renderControls()}</div>
            </ScrollArea>
          </aside>
        ) : undefined
      }
    >
      {/* PLAYGROUND, a rich-text editor (not the shared preview string): mix
          Heading 1/2/3 and Normal text in one document, with per-level size +
          line-height, like the Google Fonts specimen. Its instance chips work
          at the same scope the Style dropdown does, on the block the caret is
          in, so one paragraph can be Bold while the next stays Light.
          Unwrapped, like the Instances rows: the tab already names the view,
          so a titled card around it would just be a second frame. */}
      {tab === "tester" && (
        <Tester
          fontStyle={testerFontStyle}
          seedLines={seedLines}
          instances={font.instances}
          fontName={font.name}
          fontLoaded={fontLoaded}
        />
      )}

      {/* NAMED INSTANCES, one instance per row: its label + coords on the first
      line, an editable preview of it on the second. Editing any row's text
      updates the shared preview, so every row (and the tester) changes.
      Unwrapped, and styled like the list's FontRow: the tab already names the
      view, so a titled card around it would just be a second frame. */}
      {tab === "sample" && font.instances.length > 0 && (
        // Each row has its own bottom border, so the body's gap-4 would break
        // the stack apart.
        <div className="flex flex-col">
          {font.instances.map((inst) => (
            <InstanceRow
              key={`row:${inst.italic ? "i" : "u"}:${inst.name}`}
              inst={inst}
              specimen={specimen}
              fontName={font.name}
              fontLoaded={fontLoaded}
              size={size}
              featureSettings={featureSettings}
              varyingAxisTags={varyingAxisTags}
              onEditText={setText}
            />
          ))}
        </div>
      )}

      {tab === "glyphs" && (
        <GlyphsPanel
          font={font}
          fontLoaded={fontLoaded}
          blockName={glyphBlock}
          ranges={glyphRanges}
          loading={glyphLoading}
          scrollRef={scrollRef}
          highlightCp={glyphHighlightCp}
        />
      )}

      {tab === "use" && (
        <UsePanel font={font} axisState={axisState} italic={italic} />
      )}

      {tab === "detail" && (
        <>
          {/* METRICS, the derived style metrics FontColle filters on, with a
              baseline/x-height/cap-height diagram. Full width. */}
          <MetricsPanel font={font} />

          {/* SPECS + SUBSETS + WRITING SYSTEMS + VERSION HISTORY, one row, each
              a quarter-width column. */}
          <div className="grid gap-4 md:grid-cols-4">
            <Panel label="Specs" className="md:col-span-1">
              <SpecTable rows={specRows} />
            </Panel>
            <Panel
              label="Subsets"
              // Excludes "menu", a synthetic subset of the family-name glyphs.
              count={subsets.length || undefined}
              // flex-col + a flex-1 body give ColumnList a real height to fill:
              // the panel is stretched to the row's tallest card, but without
              // this chain that height stops at the section.
              className="flex flex-col md:col-span-1"
              bodyClassName="flex-1"
            >
              <ColumnList items={subsets} />
            </Panel>
            {font.scripts.length > 0 && (
              <Panel
                label="Writing systems"
                count={font.scripts.length}
                className="flex flex-col md:col-span-1"
                bodyClassName="flex-1"
              >
                <ColumnList items={font.scripts.map(scriptLabel)} />
              </Panel>
            )}

            {/* VERSION HISTORY, release timeline from google/fonts git history,
                newest first. The panel always shows: when nothing could be
                extracted it says so rather than vanishing, so the grid layout
                doesn't shift between fonts. */}
            <Panel
              label="Version history"
              count={
                versionHistory.length > 0 ? versionHistory.length : undefined
              }
              className="md:col-span-1"
            >
              {versionHistory.length > 0 ? (
                <Table>
                  <TableBody>
                    {[...versionHistory].reverse().map((v) => (
                      <TableRow key={v.version}>
                        <TableCell className="px-0 py-1.5 font-mono text-sm">
                          v{v.version}
                        </TableCell>
                        <TableCell className="px-0 py-1.5 text-right font-mono text-muted-foreground text-sm">
                          {formatDate(v.date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No version history.
                </p>
              )}
            </Panel>
          </div>

          {/* LANGUAGES, full width. */}
          {font.languages.length > 0 && <LanguageSupport font={font} />}
        </>
      )}

      {tab === "designer" && (
        <DesignerPanel font={font} siblingsByDesigner={siblingsByDesigner} />
      )}

      {tab === "license" && <LicensePanel font={font} />}

      {/* Mobile-only FAB + drawer for the header's outbound links, which are
          hidden below md. Fixed-position, so it renders as a page overlay
          regardless of where it sits in the tree. It keeps the lower slot on
          every tab; ControlsDrawer stacks above it where it renders. The stack
          drops with the preview dock, which is up on Instances only (see
          footerHidden above). */}
      <LinksDrawer font={font} dockVisible={tab === "sample"} />

      {/* The same controls again, for the viewports too narrow for the column
          beside the content. AnimatePresence keeps the FAB mounted through its
          exit animation when switching to a tab without controls. No per-tab
          key: Tester, Instances and Glyphs all keep the FAB, so it stays put
          and only swaps its icon rather than cross-fading two buttons in the
          same spot. */}
      <AnimatePresence initial={false}>
        {hasControls && (
          <ControlsDrawer
            title={tab === "glyphs" ? "Unicode blocks" : "Preview controls"}
            icon={tab === "glyphs" ? SquaresFourIcon : SlidersHorizontalIcon}
            dockVisible={tab === "sample"}
          >
            {(close) => renderControls(close)}
          </ControlsDrawer>
        )}
      </AnimatePresence>
    </Column>
  );
}

// UTC pins the day, so a "yyyy-MM-dd" string isn't shifted by the local zone.
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Falls back to the raw string when it isn't a "yyyy-MM-dd" date.
function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return DATE_FMT.format(new Date(`${iso}T00:00:00Z`));
}

// `column-fill: auto` only fills the left column first when the container has
// a height to fill; the default `balance` splits ~50/50. Hence h-full inside a
// panel whose body is stretched.
//
// The bullet is a ::before dot, not list-disc: a marker paints outside the
// item's content box, so `truncate` on a long entry would clip it away.
function ColumnList({ items }: { items: string[] }) {
  return (
    <ul className="h-full columns-1 gap-x-3 text-sm [column-fill:auto] lg:columns-2">
      {items.map((item) => (
        <li
          key={item}
          // A per-item margin, not gap-y: in a multi-column container gap only
          // sets the column gutter.
          className="mb-2 flex min-w-0 items-center gap-1.5 before:size-1 before:shrink-0 before:rounded-full before:bg-current before:content-['']"
        >
          <span className="truncate">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function versionOnDate(
  history: { version: string; date: string }[],
  date: string
): string | null {
  let match: string | null = null;
  // versionHistory is ascending by date.
  for (const v of history) {
    if (v.date <= date) match = v.version;
    else break;
  }
  return match;
}
