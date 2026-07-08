import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Column } from "@/components/filter-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildFeatureSettings } from "@/lib/fonts/features";
import { scriptLabel } from "@/lib/fonts/labels";
import { ensureFontRangeLoaded, useFontLoaded } from "@/lib/fonts/loader";
import { previewStyle } from "@/lib/fonts/preview-style";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { InstanceChips } from "./instance-chips";
import { InstanceRow } from "./instance-row";
import { LanguageSupport } from "./language-support";
import { Panel } from "./panel";
import { TypeTester } from "./type-tester";

export function Detail({
  font,
  size,
  axisState,
  italic,
  onLoadInstance,
  featureState,
}: {
  font: FontRecord;
  size: number;
  axisState: Record<string, number>;
  italic: boolean;
  onLoadInstance: (coords: Record<string, number>, isItalic?: boolean) => void;
  featureState: Record<string, boolean>;
}) {
  const { text, setText } = usePreview();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [tab, setTab] = useState<"sample" | "detail">("sample");
  const specimen = text || specimenFor(font);
  const hasItalic = useMemo(
    () => font.instances.some((i) => i.italic),
    [font.instances]
  );

  useEffect(() => {
    ensureFontRangeLoaded(font.name, font.axes, hasItalic);
  }, [font.name, font.axes, hasItalic]);

  const fontLoaded = useFontLoaded(font.name);

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
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72">
              {(["sample", "detail"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 font-medium text-sm capitalize transition-colors ${
                    tab === t
                      ? "bg-background text-foreground shadow-sm/5 dark:bg-input"
                      : "hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
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
              Download ↗
            </Button>
          </div>
        </>
      }
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
          {/* SPECS + SUBSETS + WRITING SYSTEMS — one row, 2:1:1 columns. */}
          <div className="grid gap-4 md:grid-cols-3">
            <Panel label="Specs" className="md:col-span-1">
              <Spec label="Variable" value={font.isVariable ? "Yes" : "No"} />
              <Spec label="Axes" value={String(font.axes.length)} />
              <Spec
                label="Named instances"
                value={String(font.instances.length)}
              />
              <Spec
                label="OpenType features"
                value={String(font.features.length)}
              />
              {font.glyphCount != null && (
                <Spec label="Glyphs" value={font.glyphCount.toLocaleString()} />
              )}
              {font.charCount != null && (
                <Spec
                  label="Characters"
                  value={font.charCount.toLocaleString()}
                />
              )}
              {font.version != null && (
                <Spec label="Version" value={String(font.version)} />
              )}
              {font.dateAdded && <Spec label="Added" value={font.dateAdded} />}
              {font.license && <Spec label="License" value={font.license} />}
            </Panel>
            <Panel label="Subsets">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {font.subsets
                  .filter((s) => s !== "menu")
                  .map((s) => (
                    <span key={s} className="truncate text-muted-foreground">
                      {s}
                    </span>
                  ))}
              </div>
            </Panel>
            {font.scripts.length > 0 && (
              <Panel label="Writing systems" count={font.scripts.length}>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {font.scripts.map((s) => (
                    <span key={s} className="truncate text-muted-foreground">
                      {scriptLabel(s)}
                    </span>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* LANGUAGES — full width. */}
          {font.languages.length > 0 && <LanguageSupport font={font} />}
        </>
      )}
    </Column>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-border border-t py-1.5 text-sm first:border-t-0">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
