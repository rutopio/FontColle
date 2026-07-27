import { ArrowLeftIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { Column } from "@/components/filter-layout";
import { FontTraits } from "@/components/font-traits";
import { PreviewBar } from "@/components/preview-dock";
import {
  RAIL_HEADER_BTN,
  RAIL_HEADER_CELL_MID,
  RAIL_HEADER_CELL_START,
} from "@/components/rail-button";
import { repoHostIcon } from "@/components/repo-host-icon";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { DesignerSibling } from "@/lib/fonts/detail";
import { buildFeatureSettings } from "@/lib/fonts/features";
import { emptyFilter } from "@/lib/fonts/filter/state";
import { scriptLabel } from "@/lib/fonts/labels";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import { fontSlug } from "@/lib/fonts/slug";
import { specimenFor, specimenLinesFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { cn } from "@/lib/utils";
import { DesignerPanel } from "./designer-panel";
import { type DetailTab, DetailTabBar } from "./detail-rail";
import { GlyphsPanel } from "./glyphs";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { LicensePanel } from "./license-panel";
import { LinksDrawer } from "./links-drawer";
import { MetricsPanel } from "./metrics-panel";
import { Panel } from "./panel";
import { type SpecRow, SpecTable } from "./spec-table";
import { Tester } from "./tester";
import { UsePanel } from "./use";

export function Detail({
  font,
  tab,
  siblingsByDesigner,
  size,
  axisState,
  italic,
  featureState,
  glyphBlock,
  glyphRanges,
  glyphLoading,
  glyphHighlightCp,
}: {
  font: FontRecord;
  tab: DetailTab;
  siblingsByDesigner: Record<string, DesignerSibling[]>;
  size: number;
  axisState: Record<string, number>;
  italic: boolean;
  featureState: Record<string, boolean>;
  glyphBlock: string;
  glyphRanges: [number, number][];
  glyphLoading: boolean;
  glyphHighlightCp: number | null;
}) {
  const { text, setText } = usePreview();
  const router = useRouter();
  // Detail-only field: absent from the shared list catalog, always present on
  // the per-font record this page loads. See DETAIL_ONLY_FIELDS in
  // scripts/gen-catalog.mjs.
  const versionHistory = font.versionHistory ?? [];
  // useCanGoBack() reads the browser history, which the server can't see: it's
  // false on the server (so the back control SSRs as a plain <a> Link) but may
  // be true right after hydration, and swapping <a> -> <button> mid-hydration
  // is a mismatch. Gate on a mount flag so the first client render matches the
  // server (Link), then upgrade to the history-back <button> once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canGoBack = useCanGoBack() && mounted;
  const specimen = text || specimenFor(font);
  // The Tester's opening document: always the family's own three-line
  // specimen passage, deliberately decoupled from the shared preview sentence.
  // The editor owns its text once mounted, so borrowing the dock's sentence
  // would make the two look linked when only the first render ever reads it.
  // Every visit to the tab therefore starts from the same known document.
  const seedLines = specimenLinesFor(font);
  // The Column's ScrollArea viewport, shared with the Glyphs grid so its
  // row-virtualizer scrolls in the same container the rest of the page does
  // (matching how the list's FontGrid scrolls in its Column).
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasItalic = useMemo(
    () => font.instances.some((i) => i.italic),
    [font.instances]
  );

  useEffect(() => {
    ensureFontRangeLoaded(font.name, font.axes, hasItalic);
  }, [font.name, font.axes, hasItalic]);

  const fontLoaded = useFontLoaded(font.name);

  // Real script subsets, minus the synthetic "menu" entry. Used for both the
  // Subsets list and its count.
  const subsets = font.subsets.filter((s) => s !== "menu");

  // Repo button icon, by host (GitHub / GitLab / SourceHut), like the list
  // card/row. Only rendered when the family has a known upstream repo.
  const RepoIcon = repoHostIcon(font.repositoryUrl);

  // Specs table rows, built as data so optional rows can be filtered out. The
  // "Added" row carries a version badge; "Last updated" deliberately omits one
  // (the git-tag history lags the font's own version, so they'd disagree).
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
    // Two different dates, deliberately both shown: Google's publish date moves
    // on any release (a metadata pass bumps it library-wide), while the binary's
    // head.modified only moves when the outlines are rebuilt. The Maintenance
    // filter buckets on the latter.
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

  // The sidebar's feature toggles as a font-feature-settings value. Shared by
  // every preview surface (Tester document, instance rows) so one
  // toggle reads the same everywhere.
  const featureSettings = useMemo(
    () => buildFeatureSettings(featureState),
    [featureState]
  );

  // Axis tags whose value actually differs across the family's named instances.
  // A family's instances often pin a dozen axes at one shared value (Roboto
  // Flex names 13 but only varies wght and slnt), and a badge repeating that
  // same number on every row carries no information. Computed once here rather
  // than per row: it's a property of the family, not of one instance.
  const varyingAxisTags = useMemo(() => {
    const seen = new Map<string, number>();
    const varying = new Set<string>();
    for (const inst of font.instances) {
      for (const [tag, value] of Object.entries(inst.coords)) {
        // First sighting records the value; any later disagreement (including
        // an instance that omits a tag others carry) marks the axis as varying.
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

  // The family styling the Tester document renders at, with no font-size:
  // the editor sets that per block type itself. Axis coords come from the
  // sidebar sliders and the instance chips (both write axisState), and the
  // feature settings from the sidebar toggles.
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
      header={
        <>
          <div className="flex w-full min-w-0 items-center gap-3 md:w-auto">
            {/* Back opens the header as the band of links closes it: the same
                cell, mirrored — flush to the column's left edge, ruled off on
                its right. Below md it falls back to a plain icon button, where
                the header wraps and there is no edge or fixed height to work
                against.

                It returns to the list. If we arrived from it, go back in
                history so its filter URL + scroll position are restored; on a
                deep/shared link (no history to go back to) fall back to the
                default, unfiltered list. */}
            <div className={RAIL_HEADER_CELL_START}>
              {canGoBack ? (
                <button
                  type="button"
                  aria-label="Back to all fonts"
                  onClick={() => router.history.back()}
                  className={cn(
                    RAIL_HEADER_BTN,
                    "group-hover/rail-btn:text-foreground"
                  )}
                >
                  <BackFace />
                </button>
              ) : (
                <Link
                  to="/"
                  aria-label="Back to all fonts"
                  className={cn(
                    RAIL_HEADER_BTN,
                    "group-hover/rail-btn:text-foreground"
                  )}
                >
                  <BackFace />
                </Link>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h1
                className="truncate font-semibold text-lg leading-tight"
                style={{ fontFamily: `"${font.name}", sans-serif` }}
              >
                {font.name}
              </h1>
              {font.designer && (
                <p className="truncate text-xs">{font.designer}</p>
              )}
            </div>
          </div>
          {/* Trait badges, same order as the list card/row (class, Variable/
              Static, color, feature count), plus the family's license.

              md:ml-auto puts all the row's slack to the left of this block, so
              it and the run of cells after it stay together at the end of the
              row. (The header carries no justify-between: with this many blocks
              it would spread them and strand the badges in the middle.) */}
          <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto md:shrink-0 md:flex-nowrap">
            <FontTraits font={font} selection={emptyFilter} />
            {font.license && <Badge variant="outline">{font.license}</Badge>}
          </div>

          {/* The outbound links and Add, as one run of header cells rather than
              outline buttons: they match Favorite and Top at the other corners,
              so the header closes with a single band of controls instead of a
              row of pills beside a cell.

              The band is its own flex box with no gap, because the header row
              around it sets gap-3 — which would push the cells apart and leave
              each rule floating in the space rather than dividing two
              neighbours. -mr-4 lives here rather than on the last cell, for the
              same reason: it is the band, not any one cell, that runs out to
              the column's edge.

              Desktop only, as the buttons were — on mobile these don't fit
              beside the title and are reached through LinksDrawer's FAB. */}
          <div className="-mr-4 hidden shrink-0 items-center md:flex">
            <HeaderLink
              href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
              label="Google"
              aria-label={`View ${font.name} on Google Fonts`}
              icon={GoogleLogoIcon}
            />
            {font.repositoryUrl && (
              <HeaderLink
                href={font.repositoryUrl}
                label="Repo"
                aria-label={`View ${font.name}'s source repository`}
                icon={RepoIcon}
              />
            )}
            {/* Add closes the band, where the list page's Favorite closes its
                own header — same control, same place either side of a
                navigation, only the meaning differs: hearting this font rather
                than switching to the hearted view. */}
            <div className={RAIL_HEADER_CELL_MID}>
              <FavoriteToggle fontId={font.id} variant="header" />
            </div>
          </div>
        </>
      }
      footer={<PreviewBar />}
      // The preview sentence field drives the instance rows, so it's up on
      // Instances only. The Tester seeds its document from the sentence once,
      // on mount, then owns it: a live field there would look like it edits
      // the document when it no longer does.
      footerHidden={tab !== "sample"}
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
        // One flush stack, not a gapped list: each row carries its own bottom
        // border, so the Column body's gap-4 would break them apart.
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
              // "menu" is a synthetic subset (the family name glyphs), not a
              // real script subset, so exclude it from the list and the count.
              count={subsets.length || undefined}
              // flex-col + a flex-1 body give ColumnList a real height to fill:
              // the panel is already stretched to the row's tallest card, but
              // without this chain that height stops at the section.
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
    </Column>
  );
}

// en-US short date, e.g. "Apr 9, 2025". UTC pins the day so a "yyyy-MM-dd"
// string isn't shifted back by the local zone.
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Render a "yyyy-MM-dd" string as "Apr 9, 2025". Falls back to the raw string
// if it isn't the expected shape.
function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return DATE_FMT.format(new Date(`${iso}T00:00:00Z`));
}

// The face of the Back control: icon over caption, like every other header
// cell. Shared by its two forms — a button when there is history to pop, a Link
// when the page was opened cold — which differ in how they navigate, not in
// what they look like.
function BackFace() {
  return (
    <>
      <ArrowLeftIcon className="size-5 shrink-0" />
      <span className="max-w-full truncate text-[10px] leading-none">Back</span>
    </>
  );
}

// One of the header's outbound links, drawn as a header cell: the same tile as
// Add beside it, in the same ruled-off full-height box, so the row closes as one
// band rather than a mix of pills and cells.
//
// A plain <a>, not the Button primitive with a render prop: nothing here wants
// Button's variants or padding, and the anchor carries its own label.
function HeaderLink({
  href,
  label,
  icon: Icon,
  "aria-label": ariaLabel,
}: {
  href: string;
  // The caption under the icon. Kept short — the cell is 72px wide, and the
  // full name ("Google Fonts") is in aria-label where it is needed.
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  "aria-label": string;
}) {
  return (
    <div className={RAIL_HEADER_CELL_MID}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
        className={cn(RAIL_HEADER_BTN, "group-hover/rail-btn:text-foreground")}
      >
        <Icon className="size-5 shrink-0" />
        <span className="max-w-full truncate text-[10px] leading-none">
          {label}
        </span>
      </a>
    </div>
  );
}

// A bulleted list whose left column fills to the bottom of the panel before
// anything spills into the right one.
//
// This is what CSS multi-column does under `column-fill: auto` — but only when
// the container has a height to fill. The default `balance` instead evens the
// columns out, which is why an auto-height list splits ~50/50. So the list runs
// h-full inside a panel whose body is stretched (flex-col + flex-1 on the
// Panel), giving the columns the row's full card height to work against.
//
// The bullet is a ::before dot rather than list-disc: a marker is painted
// outside the item's content box, so `truncate` (overflow-hidden) on a long
// entry clips it away.
function ColumnList({ items }: { items: string[] }) {
  return (
    <ul className="h-full columns-1 gap-x-3 text-sm [column-fill:auto] lg:columns-2">
      {items.map((item) => (
        <li
          key={item}
          // Row spacing is a per-item margin, not gap-y: the parent is a
          // multi-column container, where gap only sets the column gutter.
          //
          // No colour set, so these read at the default foreground like the
          // Specs values next to them. Subsets and writing systems are the
          // panel's content, not a caption about it. The bullet is bg-current,
          // so it follows the text rather than needing its own token.
          className="mb-2 flex min-w-0 items-center gap-1.5 before:size-1 before:shrink-0 before:rounded-full before:bg-current before:content-['']"
        >
          <span className="truncate">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// The version shipped on (or most recently before) a given "yyyy-MM-dd" date,
// read off the git-history timeline. Null when no version predates the date.
function versionOnDate(
  history: { version: string; date: string }[],
  date: string
): string | null {
  let match: string | null = null;
  // history is ascending by date; the last entry that isn't after `date` wins.
  for (const v of history) {
    if (v.date <= date) match = v.version;
    else break;
  }
  return match;
}
