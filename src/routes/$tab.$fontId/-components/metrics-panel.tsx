import { InfoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
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

function nearbyRange(key: MetricKey, value: number): MetricRange {
  const spec = METRIC_SPECS[key];
  // A tenth of the domain to each side reads as "in the same neighbourhood".
  const half = (spec.max - spec.min) * 0.1;
  return [Math.max(spec.min, value - half), Math.min(spec.max, value + half)];
}

function MetricsDiagram({
  font,
  style,
}: {
  font: FontRecord;
  style: CSSProperties;
}) {
  const specimenRef = useRef<SVGTextElement>(null);
  const [specimenWidth, setSpecimenWidth] = useState<number | null>(null);
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
  // Prefer typo* metrics; hhea* are padded for accents/CJK.
  const upm = font.unitsPerEm;
  const ascRaw = font.typoAscender ?? font.hheaAscender;
  const descRaw = font.typoDescender ?? font.hheaDescender;
  const asc = upm && ascRaw != null ? ascRaw / upm : capHeight;
  const desc = upm && descRaw != null ? -descRaw / upm : 0.2;

  const ascTop = asc ?? 1;
  const descBottom = desc ?? 0.2;
  const yOf = (r: number) => (ascTop - r) * 100;

  const unitsOf = (r: number): string =>
    upm ? Math.round(r * upm).toString() : "";

  const winAR = upm && font.winAscent != null ? font.winAscent / upm : null;
  const winDR = upm && font.winDescent != null ? font.winDescent / upm : null;

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

  const padY = 14;
  const padL = 120;
  const glyphX = padL;
  const measuredW = specimenWidth ?? 520;
  const labelGap = 20;
  const labelX = glyphX + measuredW + labelGap;
  const rightGutter = 180;
  const W = labelX + rightGutter;
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
            <dt className="flex items-center gap-1 text-sm">
              {spec.label}
              <Tooltip content={spec.hint} className="max-w-xs normal-case">
                <button
                  type="button"
                  aria-label={`About ${spec.label}`}
                  className="text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  <InfoIcon className="size-3.5" />
                </button>
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
