import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  GoogleLogoIcon,
} from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Column } from "@/components/filter-layout";
import { FontTraits } from "@/components/font-traits";
import { PreviewBar } from "@/components/preview-dock";
import { repoHostIcon } from "@/components/repo-host-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { DesignerSibling } from "@/lib/fonts/detail";
import { buildFeatureSettings } from "@/lib/fonts/features";
import { emptyFilter } from "@/lib/fonts/filter/state";
import { scriptLabel } from "@/lib/fonts/labels";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import { fontSlug } from "@/lib/fonts/slug";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { DesignerPanel } from "./designer-panel";
import { type DetailTab, DetailTabBar } from "./detail-rail";
import { GlyphsPanel } from "./glyphs";
import { InstanceChips } from "./instance-chips";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { LicensePanel } from "./license-panel";
import { LinksDrawer } from "./links-drawer";
import { MetricsPanel } from "./metrics-panel";
import { Panel } from "./panel";
import { type SpecRow, SpecTable } from "./spec-table";
import { TypeTester } from "./type-tester";
import { UsePanel } from "./use";

export function Detail({
  font,
  tab,
  siblingsByDesigner,
  size,
  axisState,
  italic,
  onLoadInstance,
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
  onLoadInstance: (coords: Record<string, number>, isItalic?: boolean) => void;
  featureState: Record<string, boolean>;
  glyphBlock: string;
  glyphRanges: [number, number][];
  glyphLoading: boolean;
  glyphHighlightCp: number | null;
}) {
  const { text, setText } = usePreview();
  const router = useRouter();
  // useCanGoBack() reads the browser history, which the server can't see: it's
  // false on the server (so the back control SSRs as a plain <a> Link) but may
  // be true right after hydration, and swapping <a> -> <button> mid-hydration
  // is a mismatch. Gate on a mount flag so the first client render matches the
  // server (Link), then upgrade to the history-back <button> once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canGoBack = useCanGoBack() && mounted;
  const specimen = text || specimenFor(font);
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
      badge: versionOnDate(font.versionHistory, font.dateAdded) ?? undefined,
    },
    font.lastModified && {
      label: "Last updated",
      value: formatDate(font.lastModified),
    },
    font.license && { label: "License", value: font.license },
  ].filter(Boolean) as SpecRow[];

  const specimenStyle: React.CSSProperties = useMemo(() => {
    // Preview at every axis's current value; add the size + feature settings
    // the tester exposes on top of the shared preview style.
    const coords = Object.fromEntries(
      font.axes.map((a) => [a.tag, axisState[a.tag]])
    );
    return {
      ...previewStyle({ name: font.name, loaded: fontLoaded, coords, italic }),
      fontSize: `${size}px`,
      fontFeatureSettings: buildFeatureSettings(featureState),
    };
  }, [font.name, font.axes, axisState, size, italic, featureState, fontLoaded]);

  return (
    <Column
      headerClassName="justify-between"
      scrollViewportRef={scrollRef}
      subheader={<DetailTabBar active={tab} fontId={fontSlug(font.id)} />}
      header={
        <>
          <div className="flex w-full min-w-0 items-center gap-3 md:w-auto">
            {/* Back returns to the list. If we arrived from it, go back in
                history so its filter URL + scroll position are restored; on a
                deep/shared link (no history to go back to) fall back to the
                default, unfiltered list. */}
            {canGoBack ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="All fonts"
                onClick={() => router.history.back()}
              >
                <ArrowLeftIcon />
              </Button>
            ) : (
              <Button
                render={<Link to="/" />}
                nativeButton={false}
                role="link"
                variant="ghost"
                size="icon"
                aria-label="All fonts"
              >
                <ArrowLeftIcon />
              </Button>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <h1
                className="truncate font-semibold text-lg leading-tight"
                style={{ fontFamily: `"${font.name}", sans-serif` }}
              >
                {font.name}
              </h1>
              {font.designer && (
                <p className="truncate text-muted-foreground text-xs">
                  {font.designer}
                </p>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:flex-nowrap">
            {/* Trait badges, same order as the list card/row (class, Variable/
                Static, color, feature count), plus the family's license. */}
            <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
              <FontTraits font={font} selection={emptyFilter} />
              {font.license && <Badge variant="outline">{font.license}</Badge>}
            </div>
            {/* Desktop only: on mobile these three don't fit beside the title,
                so they're reached through LinksDrawer's FAB instead. */}
            <div className="hidden items-center gap-2 md:flex">
              <Button
                variant="outline"
                nativeButton={false}
                role="link"
                render={
                  // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
                  <a
                    href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View ${font.name} on Google Fonts`}
                  />
                }
              >
                <GoogleLogoIcon />
                Google Fonts
              </Button>
              {font.repositoryUrl && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  role="link"
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
                    <a
                      href={`${font.repositoryUrl.replace(/\/$/, "")}/releases`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Download ${font.name} from its repository releases`}
                    />
                  }
                >
                  <DownloadSimpleIcon />
                  Download
                </Button>
              )}
              {font.repositoryUrl && (
                <Button
                  nativeButton={false}
                  role="link"
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
                    <a
                      href={font.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`View ${font.name}'s source repository`}
                    />
                  }
                >
                  <RepoIcon />
                  Repo
                </Button>
              )}
            </div>
          </div>
        </>
      }
      footer={<PreviewBar />}
      // The preview sentence field is only relevant to the Sample tester; on the
      // other views it slides away.
      footerHidden={tab !== "sample"}
    >
      {tab === "sample" && (
        <>
          {/* TYPE TESTER — named-instance chips set the preview axes; the
              sentence below is the editable specimen. */}
          <Panel label="Type tester">
            {font.instances.length > 0 && (
              <InstanceChips
                instances={font.instances}
                fontName={font.name}
                fontLoaded={fontLoaded}
                axisState={axisState}
                italic={italic}
                onLoadInstance={onLoadInstance}
              />
            )}
            <TypeTester
              specimen={specimen}
              style={specimenStyle}
              onEditText={setText}
            />
          </Panel>

          {/* NAMED INSTANCES, ROW VIEW — one instance per block: its label on the
          first line, an editable preview of it on the second. Editing any row's
          text updates the shared preview, so every row (and the tester) changes. */}
          {font.instances.length > 0 && (
            <Panel label="Named instances" count={font.instances.length}>
              <div className="flex flex-col">
                {font.instances.map((inst, i) => (
                  <Fragment key={`row:${inst.italic ? "i" : "u"}:${inst.name}`}>
                    {i > 0 && <Separator />}
                    <InstanceRow
                      inst={inst}
                      specimen={specimen}
                      fontName={font.name}
                      fontLoaded={fontLoaded}
                      onEditText={setText}
                    />
                  </Fragment>
                ))}
              </div>
            </Panel>
          )}
        </>
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
          {/* SPECS + SUBSETS + WRITING SYSTEMS + VERSION HISTORY — one row, each
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
              className="md:col-span-1"
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {subsets.map((s) => (
                  <span key={s} className="truncate text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </Panel>
            {font.scripts.length > 0 && (
              <Panel
                label="Writing systems"
                count={font.scripts.length}
                className="md:col-span-1"
              >
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {font.scripts.map((s) => (
                    <span key={s} className="truncate text-muted-foreground">
                      {scriptLabel(s)}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {/* VERSION HISTORY — release timeline from google/fonts git history,
                newest first. Hidden entirely when none could be extracted. */}
            {font.versionHistory.length > 0 && (
              <Panel
                label="Version history"
                count={font.versionHistory.length}
                className="md:col-span-1"
              >
                <Table>
                  <TableBody>
                    {[...font.versionHistory].reverse().map((v) => (
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
              </Panel>
            )}
          </div>

          {/* METRICS — the derived style metrics FontColle filters on, with a
              baseline/x-height/cap-height diagram. Full width. */}
          <MetricsPanel font={font} />

          {/* LANGUAGES — full width. */}
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
          drops with the preview dock, which is up on Specimen only (see
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
