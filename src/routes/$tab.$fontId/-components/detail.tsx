import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  DownloadSimpleIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { Column } from "@/components/filter-layout";
import { FontTraits } from "@/components/font-traits";
import { PreviewBar } from "@/components/preview-dock";
import { repoHostIcon } from "@/components/repo-host-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { buildFeatureSettings } from "@/lib/fonts/features";
import { emptyFilter, filterToSearch } from "@/lib/fonts/filter/state";
import { scriptLabel } from "@/lib/fonts/labels";
import { LICENSE_BOILERPLATE } from "@/lib/fonts/license-text";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { DesignerSibling } from "@/lib/fonts/queries";
import { fontSlug } from "@/lib/fonts/slug";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { CopyButton } from "./copy-button";
import type { DetailTab } from "./detail-rail";
import { GlyphsPanel } from "./glyphs";
import { InstanceChips } from "./instance-chips";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { MetricsPanel } from "./metrics-panel";
import { Panel } from "./panel";
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
  const canGoBack = useCanGoBack();
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
      header={
        <>
          <div className="flex min-w-0 items-center gap-3">
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
          <div className="flex shrink-0 items-center gap-2">
            {/* Trait badges, same order as the list card/row (class, Variable/
                Static, color, feature count), plus the family's license. */}
            <FontTraits font={font} selection={emptyFilter} />
            {font.license && <Badge variant="outline">{font.license}</Badge>}
            {font.repositoryUrl && (
              <Button
                variant="outline"
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
            {font.repositoryUrl && (
              <Button
                variant="outline"
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
            <Button
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
              <ArrowUpRightIcon />
              Google Fonts
            </Button>
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

      {tab === "use" && <UsePanel font={font} />}

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
    </Column>
  );
}

// The About view: Google Fonts' family description prose. The source is HTML, so
// we sanitize to a safe tag allowlist before rendering (see sanitize-html.ts).
// Shows an empty-state line when Google has no description, so the two-column
// Designer view keeps both columns instead of collapsing to one.
function AboutPanel({ font }: { font: FontRecord }) {
  const html = sanitizeHtml(font.about);
  return (
    <Panel label="About">
      {html ? (
        <div
          className="prose-about text-sm leading-relaxed [&_a:hover]:decoration-foreground [&_a]:underline [&_a]:decoration-muted-foreground/50 [&_p]:my-3 first:[&_p]:mt-0"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized to an allowlist in sanitizeHtml.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="py-2 text-muted-foreground text-sm">
          No description available for this family.
        </p>
      )}
    </Panel>
  );
}

// The License view: the family's full license text, mirroring Google Fonts'
// /specimen/<Family>/license page. We assemble it from the per-family OFL
// copyright header (licenseHeader) plus the shared boilerplate for that license
// (LICENSE_BOILERPLATE) — Apache/UFL have no per-family header. Plain text, so
// it renders verbatim in a monospace, scrollable block.
function LicensePanel({ font }: { font: FontRecord }) {
  const boilerplate = font.license
    ? LICENSE_BOILERPLATE[font.license]
    : undefined;
  const text = [font.licenseHeader, boilerplate]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return (
    <Panel
      label={font.license ? `License · ${font.license}` : "License"}
      action={
        text ? <CopyButton text={text} label="Copy license text" /> : undefined
      }
    >
      {text ? (
        <pre className="overflow-auto whitespace-pre-wrap font-mono text-muted-foreground text-xs leading-relaxed">
          {text}
        </pre>
      ) : (
        <p className="py-2 text-muted-foreground text-sm">
          No license text available for this family.
        </p>
      )}
    </Panel>
  );
}

// The Designer view: who made the family, each designer's Google Fonts bio and
// avatar when available, a link out to their page, and the other families they
// authored in the catalog.
function DesignerPanel({
  font,
  siblingsByDesigner,
}: {
  font: FontRecord;
  siblingsByDesigner: Record<string, DesignerSibling[]>;
}) {
  // The DB stores designers as one string; Google Fonts credits several as a
  // comma-separated list. Split so each gets their own credit + profile link.
  const designers = (font.designer ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  // Bios/avatars come keyed by designer name from the metadata endpoint; match
  // by trimmed name so each credit can show its profile.
  const profileByName = new Map(
    font.designerProfiles
      .filter((p) => p.name)
      .map((p) => [p.name?.trim() ?? "", p])
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* LEFT — the family "about" prose. */}
      <AboutPanel font={font} />

      {/* RIGHT — one block per credited designer: bio + their other families. */}
      <Panel
        label={designers.length > 1 ? "Designers" : "Designer"}
        count={designers.length || undefined}
      >
        {designers.length > 0 ? (
          <div className="flex flex-col gap-4">
            {designers.map((name, index) => {
              const profile = profileByName.get(name);
              const bio = sanitizeHtml(profile?.bio);
              const siblings = siblingsByDesigner[name] ?? [];
              return (
                <Fragment key={name}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2.5">
                        <Avatar>
                          {profile?.imageUrl && (
                            <AvatarImage
                              src={profile.imageUrl}
                              alt=""
                              loading="lazy"
                            />
                          )}
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                        <span>{name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Filter the list to just this
                                                    designer: reset every filter,
                                                    then select their capsule. */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          render={
                            <Link
                              to="/"
                              search={filterToSearch({
                                ...emptyFilter,
                                designers: [name],
                              })}
                              aria-label={`Show ${name}'s fonts in the list`}
                            />
                          }
                        >
                          <FunnelIcon />
                          Filter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          render={
                            // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
                            <a
                              href={`https://fonts.google.com/?query=${encodeURIComponent(name)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${name} on Google Fonts`}
                            />
                          }
                        >
                          <ArrowUpRightIcon />
                          Google Fonts
                        </Button>
                      </div>
                    </div>
                    {bio && (
                      <div
                        className="text-primary text-sm leading-relaxed [&_a]:underline"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized to an allowlist in sanitizeHtml.
                        dangerouslySetInnerHTML={{ __html: bio }}
                      />
                    )}
                    {siblings.length > 0 && (
                      <div className="mt-8">
                        <p className="mb-1 text-muted-foreground text-xs">
                          More by {name} ({siblings.length})
                        </p>
                        <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-muted-foreground">
                          {siblings.map((s) => (
                            <li key={s.id}>
                              <Link
                                to="/$tab/$fontId"
                                params={{
                                  tab: "specimen",
                                  fontId: fontSlug(s.name),
                                }}
                                className="truncate py-0.5 text-sm hover:text-foreground"
                                style={{
                                  fontFamily: `"${s.name}", sans-serif`,
                                }}
                              >
                                {s.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {index < designers.length - 1 && <Separator />}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-muted-foreground text-sm">
            No designer credited.
          </p>
        )}
      </Panel>
    </div>
  );
}

interface SpecRow {
  label: string;
  value: string;
  badge?: string; // version tag, rendered as "v{badge}"
}

// The Specs list as a shadcn table: label left, value (with an optional version
// badge) right-aligned. Borderless rows keep the compact spec look.
function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    <Table>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="px-0 py-1.5 text-sm">{row.label}</TableCell>
            <TableCell className="px-0 py-1.5 text-right">
              <span className="flex items-center justify-end gap-2">
                {row.badge && (
                  <Badge variant="secondary" className="font-mono">
                    v{row.badge}
                  </Badge>
                )}
                <span className="font-mono text-sm">{row.value}</span>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

// Up to two initials from a designer name, for the avatar fallback when there's
// no profile image. Uses the first and last words so "Erik Spiekermann" -> "ES".
function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
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
