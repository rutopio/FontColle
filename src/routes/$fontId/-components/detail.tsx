import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo } from "react";
import { Column } from "@/components/filter-layout";
import { PreviewBar } from "@/components/preview-dock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { buildFeatureSettings } from "@/lib/fonts/features";
import { emptyFilter, filterToSearch } from "@/lib/fonts/filter/state";
import { scriptLabel } from "@/lib/fonts/labels";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { DesignerSibling } from "@/lib/fonts/queries";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { DetailTab } from "./detail-rail";
import { InstanceChips } from "./instance-chips";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { Panel } from "./panel";
import { TypeTester } from "./type-tester";

export function Detail({
  font,
  tab,
  siblingsByDesigner,
  size,
  axisState,
  italic,
  onLoadInstance,
  featureState,
}: {
  font: FontRecord;
  tab: DetailTab;
  siblingsByDesigner: Record<string, DesignerSibling[]>;
  size: number;
  axisState: Record<string, number>;
  italic: boolean;
  onLoadInstance: (coords: Record<string, number>, isItalic?: boolean) => void;
  featureState: Record<string, boolean>;
}) {
  const { text, setText } = usePreview();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const specimen = text || specimenFor(font);
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
      header={
        <>
          <div className="flex min-w-0 items-center gap-3">
            {/* Going back (not a fresh /) lets the router restore the list's
                scroll position and filter URL. Fall back to / on deep links. */}
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
            <h1
              className="truncate font-semibold text-2xl leading-tight"
              style={{ fontFamily: `"${font.name}", sans-serif` }}
            >
              {font.name}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              render={
                // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
                <a
                  href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Download ${font.name} on Google Fonts`}
                />
              }
            >
              <ArrowUpRightIcon />
              Download
            </Button>
          </div>
        </>
      }
      footer={<PreviewBar />}
      // The preview sentence field is only relevant to the Sample tester; on the
      // other views it slides away.
      footerHidden={tab !== "sample"}
    >
      {(font.designer || font.class) && (
        <div className="flex flex-wrap items-center gap-2">
          {font.designer && (
            <span className="text-muted-foreground text-sm">
              by {font.designer}
            </span>
          )}
          <Badge variant="secondary">{font.class}</Badge>
          {font.isVariable && <Badge variant="secondary">Variable</Badge>}
          {font.license && <Badge variant="outline">{font.license}</Badge>}
        </div>
      )}

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
                {font.instances.map((inst) => (
                  <InstanceRow
                    key={`row:${inst.italic ? "i" : "u"}:${inst.name}`}
                    inst={inst}
                    specimen={specimen}
                    fontName={font.name}
                    fontLoaded={fontLoaded}
                    onEditText={setText}
                  />
                ))}
              </div>
            </Panel>
          )}
        </>
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

          {/* LANGUAGES — full width. */}
          {font.languages.length > 0 && <LanguageSupport font={font} />}
        </>
      )}

      {tab === "designer" && (
        <DesignerPanel font={font} siblingsByDesigner={siblingsByDesigner} />
      )}
    </Column>
  );
}

// The About view: Google Fonts' family description prose. The source is HTML, so
// we sanitize to a safe tag allowlist before rendering (see sanitize-html.ts).
// Renders nothing when Google has no description, so it stays out of the way on
// the Detail view for families without one.
function AboutPanel({ font }: { font: FontRecord }) {
  const html = sanitizeHtml(font.about);
  if (!html) return null;
  return (
    <Panel label="About">
      <div
        className="prose-about text-sm leading-relaxed [&_a:hover]:decoration-foreground [&_a]:underline [&_a]:decoration-muted-foreground/50 [&_p]:my-3 first:[&_p]:mt-0"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized to an allowlist in sanitizeHtml.
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
                        {profile?.imageUrl && (
                          <img
                            src={profile.imageUrl}
                            alt=""
                            loading="lazy"
                            className="size-8 shrink-0 rounded-full object-cover"
                          />
                        )}
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
                                to="/$fontId"
                                params={{ fontId: s.id }}
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
