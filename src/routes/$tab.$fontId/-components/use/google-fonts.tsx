import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { EditableValue } from "@/components/ui/editable-value";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { FontRecord } from "@/lib/fonts/types";
import { CodeBlock } from "@/routes/$tab.$fontId/-components/code-block";
import { Panel } from "@/routes/$tab.$fontId/-components/panel";
import {
  type AxisPick,
  axisName,
  axisStops,
  ExternalLink,
  MethodIntro,
  Pill,
  Step,
  Steps,
  urlFamily,
  weightLabel,
  weightList,
} from "./shared";

// METHOD 1, Google Fonts hosted API. Mirrors fonts.google.com's embed panel:
// the per-axis controls drive both the stylesheet URL and the CSS block.
export function GoogleFontsMethod({
  font,
  cssFamily,
  previewAxes,
  previewItalic,
}: {
  font: FontRecord;
  cssFamily: string;
  previewAxes: Record<string, number>;
  previewItalic: boolean;
}) {
  // How this family expresses italic: a real `ital` axis or static italic files
  // (-> `ital@1`), a `slnt` axis (-> pin slnt to its slanted min), or none.
  const italicKind: "ital" | "slnt" | "none" = font.axes.some(
    (a) => a.tag === "ital"
  )
    ? "ital"
    : font.instances.some((i) => i.italic)
      ? "ital"
      : font.axes.some((a) => a.tag === "slnt")
        ? "slnt"
        : "none";

  // When italic rides on the slnt axis the Italic toggle governs it, so slnt
  // is dropped from the list.
  const axes = [...font.axes]
    .filter((a) => !(italicKind === "slnt" && a.tag === "slnt"))
    .sort((a, b) => {
      const ra = axisRank(a.tag);
      const rb = axisRank(b.tag);
      if (ra !== rb) return ra - rb;
      return a.tag.localeCompare(b.tag, "en-US");
    });

  // Static families have no axes and expose weight via `weights` instead.
  const [picks, setPicks] = useState<Record<string, AxisPick>>(() =>
    Object.fromEntries(
      font.axes.map((a) => [
        a.tag,
        { mode: "full" as const, value: a.default ?? a.min ?? 400 },
      ])
    )
  );
  const [italic, setItalic] = useState(false);
  const setPick = (tag: string, next: Partial<AxisPick>) =>
    setPicks((p) => ({ ...p, [tag]: { ...p[tag], ...next } }));

  const matchPreview = () => {
    setPicks((prev) => {
      const next = { ...prev };
      for (const axis of font.axes) {
        const v = previewAxes[axis.tag];
        if (v == null) continue;
        next[axis.tag] = { mode: "one", value: Math.round(v) };
      }
      return next;
    });
    if (italicKind !== "none") setItalic(previewItalic);
  };
  const canMatchPreview = font.axes.length > 0;

  const href = googleFontsHref(font, picks, italic, italicKind);
  const linkTags = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${href}" rel="stylesheet" />`;
  const importRule = `@import url('${href}');`;
  const cssRule = googleFontsCss(font, cssFamily, picks, italic, italicKind);

  return (
    <Panel label="Hosted stylesheet" bodyClassName="max-w-2xl">
      <MethodIntro blurb="No build step. Embed the family and the browser loads the font from Google's CDN. This exposes visitors' IPs to Google and may fall foul of GDPR, if privacy matters, use Bunny Fonts instead." />
      <Steps>
        <Step n={1} label="Configure the axes">
          {canMatchPreview && (
            <button
              type="button"
              onClick={matchPreview}
              className="mb-3 flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
            >
              <SlidersHorizontalIcon className="size-3.5" />
              Match current preview
            </button>
          )}
          <ul className="flex list-disc flex-col gap-3 pl-5 marker:text-muted-foreground">
            {/* Style (Roman/Italic) leads, then the axes in order. Its switch is
                a Tabs control aligned right, matching each axis's Full/One tab. */}
            {italicKind !== "none" && (
              <li>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Style</span>
                  <Tabs
                    value={italic ? "italic" : "roman"}
                    onValueChange={(v) => setItalic(v === "italic")}
                    className="shrink-0"
                  >
                    <TabsList className="h-8">
                      <TabsTab value="roman" className="h-full sm:h-full">
                        Roman
                      </TabsTab>
                      <TabsTab value="italic" className="h-full sm:h-full">
                        Italic
                      </TabsTab>
                    </TabsList>
                  </Tabs>
                </div>
              </li>
            )}
            {axes.length > 0 ? (
              axes.map((axis) => (
                <li key={axis.tag}>
                  <AxisControl
                    axis={axis}
                    pick={picks[axis.tag]}
                    onChange={(next) => setPick(axis.tag, next)}
                  />
                </li>
              ))
            ) : (
              <li>
                <StaticWeightControl
                  weights={font.weights}
                  value={picks.wght?.value ?? 400}
                  onChange={(v) =>
                    setPicks({ wght: { mode: "one", value: v } })
                  }
                />
              </li>
            )}
          </ul>
        </Step>
        <Step n={2} label="Embed the stylesheet">
          {/* Google Fonts offers two ways to pull the same stylesheet URL: a
              <link> in the document head, or an @import at the top of a CSS
              file. One tab per mode; the URL is identical, only the syntax
              differs. */}
          <Tabs defaultValue="link">
            <TabsList className="mb-2">
              <TabsTab value="link">&lt;link&gt;</TabsTab>
              <TabsTab value="import">@import</TabsTab>
            </TabsList>
            <TabsPanel value="link">
              <CodeBlock code={linkTags} lang="html" />
              <p className="mt-1.5 text-xs">
                Paste inside your document{" "}
                <code className="font-mono">&lt;head&gt;</code>.
              </p>
            </TabsPanel>
            <TabsPanel value="import">
              <CodeBlock code={importRule} lang="css" />
              <p className="mt-1.5 text-xs">
                Place at the very top of a CSS file, before other rules.
              </p>
            </TabsPanel>
          </Tabs>
        </Step>
        <Step n={3} label="Apply with CSS">
          <CodeBlock code={cssRule} lang="css" />
        </Step>
      </Steps>
      <ExternalLink
        href={`https://fonts.google.com/specimen/${urlFamily(font.name)}`}
        label="Full options on Google Fonts"
      />
    </Panel>
  );
}

function AxisControl({
  axis,
  pick,
  onChange,
}: {
  axis: FontRecord["axes"][number];
  pick: AxisPick;
  onChange: (next: Partial<AxisPick>) => void;
}) {
  const min = axis.min ?? 0;
  const max = axis.max ?? min;
  // Registry stops inside this family's range. opsz's stops are just point
  // sizes and slnt has only one, so those stay slider-only.
  const stops = STOP_AXES.has(axis.tag)
    ? axisStops(axis.tag).filter((s) => s.value >= min && s.value <= max)
    : [];

  return (
    // Controlled, so the One-value controls animate their height as the mode
    // flips instead of popping in and out.
    <Collapsible open={pick.mode === "one"} className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm">
          {axisName(axis.tag)}
          <span className="ml-1.5 font-mono text-muted-foreground text-xs">
            {axis.tag}
          </span>
        </span>
        {min < max && (
          <Tabs
            value={pick.mode}
            onValueChange={(v) => onChange({ mode: v as "full" | "one" })}
            className="shrink-0"
          >
            {/* Match the list's Grid/Row switch: an h-8 list with h-full
                triggers (which beat the tab's own h-9 sm:h-8). */}
            <TabsList className="h-8">
              <TabsTab value="full" className="h-full sm:h-full">
                Full axis
              </TabsTab>
              <TabsTab value="one" className="h-full sm:h-full">
                One value
              </TabsTab>
            </TabsList>
          </Tabs>
        )}
      </div>
      {/* base-ui exposes the panel's natural height as a CSS var; animate `height`
          between it and 0, clipping the overflow so the content slides open. */}
      <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-[var(--motion-fast)] ease-[var(--ease-snap)] data-[ending-style]:h-0 data-[starting-style]:h-0">
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-3">
            <Slider
              value={pick.value}
              min={min}
              max={max}
              step={1}
              onChange={(v) => onChange({ value: Array.isArray(v) ? v[0] : v })}
              showValue={false}
              label={`${axisName(axis.tag)} value`}
              className="min-w-0 flex-1"
            />
            <span className="w-12 shrink-0 text-right">
              <EditableValue
                value={pick.value}
                min={min}
                max={max}
                presets={stops.map((s) => s.value)}
                onChange={(v) => onChange({ value: v })}
                ariaLabel={`${axisName(axis.tag)} value`}
              />
            </span>
          </div>
          {stops.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stops.map((s) => (
                <Pill
                  key={s.value}
                  active={pick.value === s.value}
                  onClick={() => onChange({ value: s.value })}
                >
                  {s.name} {s.value}
                </Pill>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StaticWeightControl({
  weights,
  value,
  onChange,
}: {
  weights: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">
        Weight
        <span className="ml-1.5 font-mono text-muted-foreground text-xs">
          wght
        </span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {weightList(weights).map((w) => (
          <Pill key={w} active={value === w} onClick={() => onChange(w)}>
            {weightLabel(w)} {w}
          </Pill>
        ))}
      </div>
    </div>
  );
}

// Lower rank sorts earlier; everything unlisted follows, alphabetically.
const AXIS_ORDER = ["wght", "wdth", "opsz", "slnt"];
const axisRank = (tag: string): number => {
  const i = AXIS_ORDER.indexOf(tag);
  return i === -1 ? AXIS_ORDER.length : i;
};

// Only these have a compact, meaningful set of registry stops; opsz's are bare
// point sizes and the parametric axes have none worth showing.
const STOP_AXES = new Set(["wght", "wdth"]);

// Mirrors fonts.google.com's embed URL: the axis tags as an alphabetically
// sorted tuple (en-US, case-insensitive, so lowercase registered axes precede
// uppercase custom ones), then their values in the same order — `min..max` for
// a Full-axis pick, the pinned number for a One-value pick.
function googleFontsHref(
  font: FontRecord,
  picks: Record<string, AxisPick>,
  italic: boolean,
  italicKind: "ital" | "slnt" | "none"
): string {
  const family = urlFamily(font.name);
  const parts: { tag: string; value: string }[] = [];
  // A real `ital` axis becomes `ital@1`; a slnt family pins slnt to its min.
  const slnt = font.axes.find((a) => a.tag === "slnt");
  if (italic && italicKind === "ital") parts.push({ tag: "ital", value: "1" });
  if (italic && italicKind === "slnt" && slnt?.min != null) {
    parts.push({ tag: "slnt", value: String(slnt.min) });
  }
  for (const axis of font.axes) {
    // The slnt axis is governed by the Italic toggle above, not its own pick.
    if (italicKind === "slnt" && axis.tag === "slnt") continue;
    const pick = picks[axis.tag];
    if (!pick) continue;
    const min = axis.min ?? pick.value;
    const max = axis.max ?? pick.value;
    if (pick.mode === "full" && min < max) {
      parts.push({ tag: axis.tag, value: `${min}..${max}` });
    } else {
      parts.push({ tag: axis.tag, value: String(pick.value) });
    }
  }
  if (parts.every((p) => p.tag === "ital")) {
    const w = picks.wght?.value ?? 400;
    parts.push({ tag: "wght", value: String(w) });
  }
  parts.sort((a, b) =>
    a.tag.toLowerCase().localeCompare(b.tag.toLowerCase(), "en-US")
  );
  const tags = parts.map((p) => p.tag).join(",");
  const values = parts.map((p) => p.value).join(",");
  const spec = `:${tags}@${values}`;
  return `https://fonts.googleapis.com/css2?family=${family}${spec}&display=swap`;
}

// Matches GF's "CSS class" snippet: the standard properties for the common
// axes, then font-variation-settings for any other axis pinned to a single
// value. A Full-axis pick leaves its axis free, so it isn't written here.
function googleFontsCss(
  font: FontRecord,
  cssFamily: string,
  picks: Record<string, AxisPick>,
  italic: boolean,
  italicKind: "ital" | "slnt" | "none"
): string {
  const lines = [`  font-family: ${cssFamily};`];
  const has = (tag: string) => font.axes.some((a) => a.tag === tag);
  if (has("opsz")) lines.push("  font-optical-sizing: auto;");
  const wght = picks.wght;
  if (wght) lines.push(`  font-weight: ${wght.value};`);
  const wdth = picks.wdth;
  if (wdth?.mode === "one") lines.push(`  font-width: ${wdth.value}%;`);
  // An `ital` axis is a plain font-style; a slnt family needs an oblique angle.
  const slnt = font.axes.find((a) => a.tag === "slnt");
  if (italicKind === "slnt" && italic && slnt?.min != null) {
    lines.push(`  font-style: oblique ${-slnt.min}deg;`);
  } else {
    lines.push(`  font-style: ${italic ? "italic" : "normal"};`);
  }
  // Everything left over, in the alphabetical order GF uses. wght/wdth/opsz
  // have dedicated properties above, and slnt is covered by font-style when it
  // is the italic mechanism.
  const vars = font.axes
    .filter(
      (a) =>
        a.tag !== "wght" &&
        a.tag !== "wdth" &&
        a.tag !== "opsz" &&
        !(italicKind === "slnt" && a.tag === "slnt") &&
        picks[a.tag]?.mode === "one"
    )
    .sort((a, b) =>
      a.tag.toLowerCase().localeCompare(b.tag.toLowerCase(), "en-US")
    )
    .map((a) => `"${a.tag}" ${picks[a.tag].value}`);
  if (vars.length > 0) {
    lines.push(`  font-variation-settings: ${vars.join(", ")};`);
  }
  return `.selector {\n${lines.join("\n")}\n}`;
}
