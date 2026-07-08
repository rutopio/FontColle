import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import type { FontInstance, FontRecord } from "@/lib/fonts/types";
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
            <a
              href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-foreground bg-foreground px-4 py-2 font-medium text-background text-sm"
            >
              Download ↗
            </a>
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
                    fontFamily={previewFontFamily(font.name, fontLoaded)}
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
          {/* SPECS + SUBSETS */}
          <div className="grid gap-4 md:grid-cols-1">
            <Panel label="Specs">
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
        </>
      )}
    </Column>
  );
}

// One named-instance row: label (loads the instance on click) plus a large
// preview line that doubles as a text field. Clicking the preview opens an
// input seeded with the current text; committing pushes it to the shared
// preview, so every row and the type tester update together.
function InstanceRow({
  inst,
  specimen,
  fontFamily,
  onEditText,
}: {
  inst: FontInstance;
  specimen: string;
  fontFamily: string;
  onEditText: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const previewStyle: React.CSSProperties = {
    fontFamily,
    fontWeight: inst.coords.wght ? Math.round(inst.coords.wght) : undefined,
    fontStyle: inst.italic ? "italic" : undefined,
    fontVariationSettings: Object.entries(inst.coords)
      .map(([t, v]) => `"${t}" ${v}`)
      .join(", "),
  };

  return (
    <div className="flex flex-col gap-4 overflow-hidden border-border border-t py-3 first:border-t-0">
      <span className="flex items-baseline gap-2">
        <span className=" text-sm">{inst.name}</span>
        <span className="truncate font-mono text-muted-foreground text-xs">
          {Object.entries(inst.coords)
            .map(([t, v]) => `${t} ${v}`)
            .join("  ")}
        </span>
      </span>
      {editing ? (
        <input
          type="text"
          dir="auto"
          value={draft}
          // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened.
          autoFocus
          aria-label={`Preview text for ${inst.name}`}
          onChange={(e) => {
            setDraft(e.target.value);
            onEditText(e.target.value.trim());
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") setEditing(false);
          }}
          style={previewStyle}
          className="w-full border-transparent border-b bg-transparent text-start text-3xl leading-tight outline-none focus:border-foreground"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(specimen);
            setEditing(true);
          }}
          aria-label={`Edit preview text for ${inst.name}`}
          dir="auto"
          style={previewStyle}
          className="w-full cursor-text truncate border-transparent border-b text-start text-3xl leading-tight"
        >
          {specimen}
        </button>
      )}
    </div>
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
