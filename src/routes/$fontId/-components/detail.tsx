import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Column } from "@/components/filter-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildFeatureSettings } from "@/lib/fonts/features";
import {
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";
import { LanguageSupport } from "./language-support";
import { Panel } from "./panel";

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
  const { text } = usePreview();
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

  const specimenStyle: React.CSSProperties = useMemo(() => {
    const varSettings = font.axes
      .map((a) => `"${a.tag}" ${axisState[a.tag]}`)
      .join(", ");
    return {
      fontFamily: previewFontFamily(font.name, fontLoaded),
      fontSize: `${size}px`,
      fontWeight: axisState.wght ? Math.round(axisState.wght) : undefined,
      fontStyle: italic ? "italic" : undefined,
      fontVariationSettings: varSettings || undefined,
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
          <a
            href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-foreground bg-foreground px-4 py-2 font-medium text-background text-sm"
          >
            Download ↗
          </a>
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

      {/* TYPE TESTER */}
      <Panel label="Type tester">
        <p
          dir="auto"
          style={specimenStyle}
          className="break-words leading-tight"
        >
          {specimen}
        </p>
      </Panel>

      {/* NAMED INSTANCES */}
      {font.instances.length > 0 && (
        <Panel label="Named instances" count={font.instances.length}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {font.instances.map((inst) => (
              <button
                key={`${inst.italic ? "i" : "u"}:${inst.name}`}
                type="button"
                onClick={() => onLoadInstance(inst.coords, inst.italic)}
                className="rounded-md border p-3 text-left transition-colors hover:border-foreground"
              >
                <span
                  className="text-2xl"
                  style={{
                    fontFamily: previewFontFamily(font.name, fontLoaded),
                    fontWeight: inst.coords.wght
                      ? Math.round(inst.coords.wght)
                      : undefined,
                    fontStyle: inst.italic ? "italic" : undefined,
                    fontVariationSettings: Object.entries(inst.coords)
                      .map(([t, v]) => `"${t}" ${v}`)
                      .join(", "),
                  }}
                >
                  Ag
                </span>
                <span className="mt-2 block font-mono text-muted-foreground text-xs">
                  {inst.name}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* SPECS + SUBSETS */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel label="Specs">
          <Spec label="Variable" value={font.isVariable ? "Yes" : "No"} />
          <Spec label="Axes" value={String(font.axes.length)} />
          <Spec label="Named instances" value={String(font.instances.length)} />
          <Spec
            label="OpenType features"
            value={String(font.features.length)}
          />
          {font.glyphCount != null && (
            <Spec label="Glyphs" value={font.glyphCount.toLocaleString()} />
          )}
          {font.charCount != null && (
            <Spec label="Characters" value={font.charCount.toLocaleString()} />
          )}
          {font.version != null && (
            <Spec label="Version" value={String(font.version)} />
          )}
          {font.dateAdded && <Spec label="Added" value={font.dateAdded} />}
          {font.license && <Spec label="License" value={font.license} />}
        </Panel>
        <Panel label="Subsets">
          <div className="flex flex-wrap gap-1.5">
            {font.subsets
              .filter((s) => s !== "menu")
              .map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
          </div>
        </Panel>
      </div>

      {/* WRITING SYSTEMS + LANGUAGES */}
      {(font.scripts.length > 0 || font.languages.length > 0) && (
        <LanguageSupport font={font} />
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
