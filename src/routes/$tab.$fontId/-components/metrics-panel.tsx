import { InfoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { emptyFilter, filterToSearch } from "@/lib/fonts/filter/state";
import {
  derive,
  formatMetricValue,
  METRIC_ORDER,
  METRIC_SPECS,
  type MetricKey,
  type MetricRange,
  type MetricSpec,
} from "@/lib/fonts/metrics";
import type { FontRecord } from "@/lib/fonts/types";
import { Panel } from "./panel";

// A ±window around a value, clamped to the metric's domain, used to build the
// "find fonts with a similar x-height" list filter each row links to.
function nearbyRange(key: MetricKey, value: number): MetricRange {
  const spec = METRIC_SPECS[key];
  // A tenth of the domain to each side reads as "in the same neighbourhood".
  const half = (spec.max - spec.min) * 0.1;
  return [Math.max(spec.min, value - half), Math.min(spec.max, value + half)];
}

// The baseline/x-height/cap-height diagram: renders "Hxg" in the family itself
// with horizontal guides at the ratios the font declares, so the abstract
// numbers below have a picture. Uses the derived ratios (fraction of the em) to
// place each guide; falls back to hiding a guide whose value is unavailable.
function MetricsDiagram({
  font,
  style,
}: {
  font: FontRecord;
  style: CSSProperties;
}) {
  // Measured width of the rendered specimen text, in the SVG's user units (the
  // specimen is drawn at fontSize 100, so getComputedTextLength already returns
  // diagram units). null until the layout effect runs; drives where the right
  // labels sit so they never overlap the glyphs regardless of family width.
  const specimenRef = useRef<SVGTextElement>(null);
  const [specimenWidth, setSpecimenWidth] = useState<number | null>(null);
  // Measure after paint, then again once the web font loads (the first measure
  // may catch the fallback face). Keyed on the family so switching fonts
  // re-measures. document.fonts.ready resolves once all pending faces settle.
  // biome-ignore lint/correctness/useExhaustiveDependencies: font.name is the re-measure trigger; the measure closure is stable.
  useLayoutEffect(() => {
    const measure = () => {
      const w = specimenRef.current?.getComputedTextLength();
      if (w) setSpecimenWidth(w);
    };
    measure();
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [font.name]);

  const xHeight = derive(font, "xHeight");
  const capHeight = derive(font, "capHeight");
  // Ascender/descender as fractions of the em, for the typographic ascender /
  // descender lines (the tops of b/d/h and bottoms of g/p/y). Prefer the OS/2
  // typo* trio: those track the design's ascender, sitting just above cap-height.
  // hhea* is a line-layout metric that runs much taller (it pads for accents and
  // CJK), so using it drew the ascender line far above cap-height. Fall back to
  // hhea* then to cap-height when typo* is absent. Positive descender for drawing
  // below the baseline.
  const upm = font.unitsPerEm;
  const ascRaw = font.typoAscender ?? font.hheaAscender;
  const descRaw = font.typoDescender ?? font.hheaDescender;
  const asc = upm && ascRaw != null ? ascRaw / upm : capHeight;
  const desc = upm && descRaw != null ? -descRaw / upm : 0.2;

  // Viewbox: 1 em of ascent + descent, with a little side padding. y grows down,
  // so the baseline sits at y = ascentTop, and a ratio r maps to ascentTop - r.
  const ascTop = asc ?? 1;
  const descBottom = desc ?? 0.2;
  const yOf = (r: number) => (ascTop - r) * 100;

  // Raw font-unit value shown after each label (e.g. "ascender 880"), so the
  // number matches how a font editor reports the metric. Ratios × upm recover
  // the cap/x-height units; asc/desc keep the head-table value directly.
  const unitsOf = (r: number): string =>
    upm ? Math.round(r * upm).toString() : "";

  // Win ascent/descent as em fractions: the font's real ink bounds (yMax/yMin).
  const winAR = upm && font.winAscent != null ? font.winAscent / upm : null;
  const winDR = upm && font.winDescent != null ? font.winDescent / upm : null;

  // side "left" labels sit before the specimen, right-aligned (end-anchored);
  // the rest sit after it, left-aligned. The win bounds go left to set them
  // apart from the typo/cap/x guides on the right.
  type Guide = { r: number; label: string; units: string; side?: "left" };
  const guides: Guide[] = [
    winAR != null
      ? {
          r: winAR,
          label: "OS/2.usWinAscent",
          units: String(font.winAscent),
          side: "left",
        }
      : null,
    asc != null
      ? {
          r: asc,
          // Name the actual source so the number isn't mistaken for the letter
          // ascender line: it's OS/2.sTypoAscender (falling back to hhea).
          label:
            font.typoAscender != null
              ? "OS/2.sTypoAscender"
              : font.hheaAscender != null
                ? "hhea.ascender"
                : "ascender",
          units: ascRaw != null ? String(ascRaw) : unitsOf(asc),
        }
      : null,
    capHeight != null
      ? { r: capHeight, label: "cap-height", units: unitsOf(capHeight) }
      : null,
    xHeight != null
      ? { r: xHeight, label: "x-height", units: unitsOf(xHeight), side: "left" }
      : null,
    { r: 0, label: "baseline", units: "0" },
    desc != null
      ? {
          r: -descBottom,
          label:
            font.typoDescender != null
              ? "OS/2.sTypoDescender"
              : font.hheaDescender != null
                ? "hhea.descender"
                : "descender",
          units: descRaw != null ? String(descRaw) : unitsOf(-descBottom),
        }
      : null,
    winDR != null
      ? {
          r: -winDR,
          label: "OS/2.usWinDescent",
          units: String(font.winDescent),
          side: "left",
        }
      : null,
  ].filter((g): g is Guide => g != null);

  // Extra vertical breathing room above ascender / below descender, and a right
  // gutter wide enough to hold the guide labels clear of the specimen's "g".
  const padY = 14;
  // Left gutter holds the end-anchored win labels; the specimen and guide lines
  // start after it. Left-aligned mono labels start just past the ~340-unit
  // "HQxibg" specimen. The right gutter must clear the longest label, the
  // 18-char "OS/2.sTypoAscender" plus its units, ~110 units wide at 8px mono,
  // with breathing room, or the text butts against the viewBox edge.
  const padL = 120;
  const glyphX = padL;
  // Horizontal room reserved for the specimen before the right-hand labels
  // begin. The specimen's real width varies hugely by family, "HQxibg" at a
  // 100-unit em runs ~420 units in Montserrat but ~900 in a very wide display
  // face, so a fixed budget either wastes space or lets the specimen lap the
  // labels (the baseline/cap-height overlap). We measure the rendered specimen
  // (see the effect below) and place the labels just past it; until that
  // measurement lands (SSR / first paint) fall back to a budget that clears the
  // common case.
  const measuredW = specimenWidth ?? 520;
  const labelGap = 20;
  const labelX = glyphX + measuredW + labelGap;
  // Right gutter: longest label+units (~110) + a comfortable trailing margin.
  const rightGutter = 180;
  const W = labelX + rightGutter;
  // The win guides can reach past the ascender/descender lines, so size the
  // viewbox to whichever extends furthest, then add the vertical padding.
  const topExtent = Math.max(ascTop, winAR ?? ascTop);
  const botExtent = Math.max(descBottom, winDR ?? descBottom);
  const vbY = yOf(topExtent) - padY;
  const vbH = (topExtent + botExtent) * 100 + padY * 2;

  return (
    <svg
      viewBox={`0 ${vbY} ${W} ${vbH}`}
      className="h-56 w-full"
      role="img"
      aria-label="Diagram of the font's win ascent/descent bounds, baseline, x-height, cap-height, ascender and descender"
    >
      <title>Vertical metrics diagram</title>
      {guides.map((g) => {
        const y = yOf(g.r);
        const left = g.side === "left";
        return (
          <g key={g.label}>
            <line
              x1={glyphX}
              x2={labelX - 8}
              y1={y}
              y2={y}
              className="stroke-muted-foreground/70"
              strokeWidth={1}
              strokeDasharray={g.label === "baseline" ? undefined : "2 2"}
            />
            <text
              x={left ? glyphX - 8 : labelX}
              y={y}
              textAnchor={left ? "end" : "start"}
              dominantBaseline="central"
              className="fill-muted-foreground font-mono"
              style={{ fontSize: 8 }}
            >
              {g.units ? `${g.label} ${g.units}` : g.label}
            </text>
          </g>
        );
      })}
      {/* The specimen letters, sized to one em (100 user units) sitting on the
          baseline, so their real shapes line up with the declared guides. The
          leading/trailing spaces (xml:space=preserve) give equal breathing room
          before "H" and after "g". */}
      <text
        ref={specimenRef}
        x={glyphX}
        y={yOf(0)}
        xmlSpace="preserve"
        style={{ ...style, fontSize: 100 }}
        className="fill-foreground"
      >
        {" HQxibg "}
      </text>
    </svg>
  );
}

// Detail "Metrics" panel: the derived style metrics FontColle filters on, shown
// per-family for the first time. Each row links back to the list pre-filtered to
// a neighbourhood of this font's value, closing the explore loop. A diagram up
// top pictures the vertical metrics. Renders nothing when the font carries no
// usable metric at all (older harvest / missing OS-2 table).
export function MetricsPanel({ font }: { font: FontRecord }) {
  const rows = METRIC_ORDER.map((key) => ({
    key,
    spec: METRIC_SPECS[key],
    value: derive(font, key),
  })).filter(
    (r): r is { key: MetricKey; spec: MetricSpec; value: number } =>
      r.value != null
  );

  if (rows.length === 0) return null;

  const style: CSSProperties = {
    fontFamily: `"${font.name}", sans-serif`,
  };

  return (
    <Panel label="Metrics" count={rows.length}>
      <MetricsDiagram font={font} style={style} />
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map(({ key, spec, value }) => (
          <div
            key={key}
            className="flex items-baseline justify-between gap-2 border-border/60 border-b py-1.5"
          >
            <dt className="flex items-center gap-1 text-muted-foreground text-sm">
              {spec.label}
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label={`About ${spec.label}`}
                  className="text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  <InfoIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs normal-case">
                  {spec.hint}
                </TooltipContent>
              </Tooltip>
            </dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {formatMetricValue(key, value)}
              </span>
              <Link
                to="/"
                search={filterToSearch({
                  ...emptyFilter,
                  metrics: { [key]: nearbyRange(key, value) },
                })}
                aria-label={`Find fonts with a similar ${spec.label.toLowerCase()}`}
                className="font-medium text-primary text-xs underline decoration-primary/40 hover:decoration-primary"
              >
                Similar
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
