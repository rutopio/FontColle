import type * as React from "react";
import { useMemo, useRef, useState } from "react";
import { Column } from "@/components/filter-layout";
import { PreviewBar } from "@/components/preview-dock";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { DesignerSibling } from "@/lib/fonts/detail";
import { buildFeatureSettings } from "@/lib/fonts/features";
import { scriptLabel } from "@/lib/fonts/labels";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import { specimenFor, specimenLinesFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { DesignerPanel } from "./designer-panel";
import { type DetailTab, DetailTabBar } from "./detail-rail";
import { GlyphsBlockHeading, GlyphsPanel } from "./glyphs";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { LicenseHeading, LicensePanel } from "./license-panel";
import { LinksDrawer } from "./links-drawer";
import { MetricsPanel } from "./metrics-panel";
import { Panel } from "./panel";
import { type SpecRow, SpecTable } from "./spec-table";
import { Tester } from "./tester";
import { type UseMethod, UseMethodTabs, UsePanel } from "./use";
import { VariableRow } from "./variable-row";

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
  const versionHistory = font.versionHistory ?? [];
  const specimen = text || specimenFor(font);
  const seedLines = specimenLinesFor(font);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasItalic = useMemo(
    () => font.instances.some((i) => i.italic),
    [font.instances]
  );

  useMountEffect(() => {
    ensureFontRangeLoaded(font.name, font.axes, hasItalic);
  });

  const fontLoaded = useFontLoaded(font.name);

  const [useMethod, setUseMethod] = useState<UseMethod>("google");

  const subsets = font.subsets.filter((s) => s !== "menu");

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
      label: "Added to Google Fonts",
      value: formatDate(font.dateAdded),
      badge: versionOnDate(versionHistory, font.dateAdded) ?? undefined,
    },
    font.upstreamHeadDate && {
      label: "Upstream Updated",
      value: formatDate(font.upstreamHeadDate),
      badge: font.upstreamArchived ? "Archived" : undefined,
    },
    font.gfTtfCommitDate && {
      label: "Google Fonts Updated",
      value: formatDate(font.gfTtfCommitDate),
    },
    font.modifiedMs != null &&
      font.modifiedMs > 0 && {
        label: "Font built",
        value: formatDate(new Date(font.modifiedMs).toISOString().slice(0, 10)),
      },
    font.license && { label: "License", value: font.license },
  ].filter(Boolean) as SpecRow[];

  const featureSettings = useMemo(
    () => buildFeatureSettings(featureState),
    [featureState]
  );

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

  const testerFontStyle: React.CSSProperties = useMemo(() => {
    const coords = Object.fromEntries(
      font.axes.map((a) => [a.tag, axisState[a.tag]])
    );
    return {
      ...previewStyle({
        name: font.name,
        showNotdef: true,
        coords,
        italic,
      }),
      fontFeatureSettings: featureSettings,
    };
  }, [font.name, font.axes, axisState, italic, featureSettings]);

  return (
    <>
      <Column
        scrollViewportRef={scrollRef}
        subheader={<DetailTabBar active={tab} fontId={font.id} />}
        toolbar={
          (tab === "glyphs" && <GlyphsBlockHeading blockName={glyphBlock} />) ||
          (tab === "license" && <LicenseHeading font={font} />) ||
          (tab === "use" && (
            <UseMethodTabs method={useMethod} onMethodChange={setUseMethod} />
          ))
        }
        footer={
          <PreviewBar
            onScrollTop={() =>
              scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
            }
          />
        }
        footerHidden={tab !== "sample"}
      >
        {tab === "tester" && (
          <Tester
            fontStyle={testerFontStyle}
            seedLines={seedLines}
            instances={font.instances}
            fontName={font.name}
          />
        )}

        {tab === "sample" && (
          <VariableRow
            fontName={font.name}
            axes={font.axes}
            instances={font.instances}
            specimen={specimen}
            italic={italic}
            showNotdef
          />
        )}

        {tab === "sample" && font.instances.length > 0 && (
          <div className="flex flex-col">
            {font.instances.map((inst) => (
              <InstanceRow
                key={`row:${inst.italic ? "i" : "u"}:${inst.name}`}
                inst={inst}
                specimen={specimen}
                fontName={font.name}
                fontLoaded={fontLoaded}
                showNotdef
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
          <UsePanel
            font={font}
            axisState={axisState}
            italic={italic}
            method={useMethod}
          />
        )}

        {tab === "detail" && (
          <>
            <MetricsPanel font={font} />

            <div className="grid gap-4 md:grid-cols-4">
              <Panel label="Specs" className="md:col-span-2 xl:col-span-1">
                <SpecTable rows={specRows} />
              </Panel>
              <Panel
                label="Subsets"
                count={subsets.length || undefined}
                className="flex flex-col md:col-span-2 xl:col-span-1"
                bodyClassName="flex-1"
              >
                <ColumnList items={subsets} />
              </Panel>
              {font.scripts.length > 0 && (
                <Panel
                  label="Writing systems"
                  count={font.scripts.length}
                  className="flex flex-col md:col-span-2 xl:col-span-1"
                  bodyClassName="flex-1"
                >
                  <ColumnList items={font.scripts.map(scriptLabel)} />
                </Panel>
              )}

              <Panel
                label="Version history"
                count={
                  versionHistory.length > 0 ? versionHistory.length : undefined
                }
                className="md:col-span-2 xl:col-span-1"
              >
                {versionHistory.length > 0 ? (
                  <Table>
                    <TableBody>
                      {[...versionHistory].reverse().map((v, i) => (
                        <TableRow key={v.version} index={i}>
                          <TableCell className="px-0 py-1.5 font-mono text-sm">
                            {v.version}
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

            {font.languages.length > 0 && <LanguageSupport font={font} />}
          </>
        )}

        {tab === "designer" && (
          <DesignerPanel font={font} siblingsByDesigner={siblingsByDesigner} />
        )}

        {tab === "license" && <LicensePanel font={font} />}
      </Column>
      <LinksDrawer font={font} dockVisible={tab === "sample"} />
    </>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return DATE_FMT.format(new Date(`${iso}T00:00:00Z`));
}

function ColumnList({ items }: { items: string[] }) {
  return (
    <ul className="h-full columns-1 gap-x-3 text-sm [column-fill:auto] lg:columns-2">
      {items.map((item) => (
        <li
          key={item}
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
  for (const v of history) {
    if (v.date <= date) match = v.version;
    else break;
  }
  return match;
}
