import { InfoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
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
  const xHeight = derive(font, "xHeight");
  const capHeight = derive(font, "capHeight");
  // Ascender/descender as fractions of the em, from the hhea trio (the line the
  // browser lays type on). Positive descender for drawing below the baseline.
  const upm = font.unitsPerEm;
  const asc =
    upm && font.hheaAscender != null ? font.hheaAscender / upm : capHeight;
  const desc =
    upm && font.hheaDescender != null ? -font.hheaDescender / upm : 0.2;

  // Viewbox: 1 em of ascent + descent, with a little side padding. y grows down,
  // so the baseline sits at y = ascentTop, and a ratio r maps to ascentTop - r.
  const ascTop = asc ?? 1;
  const descBottom = desc ?? 0.2;
  const H = ascTop + descBottom;
  const yOf = (r: number) => (ascTop - r) * 100;

  const guides: { r: number; label: string }[] = [
    asc != null ? { r: asc, label: "ascender" } : null,
    capHeight != null ? { r: capHeight, label: "cap-height" } : null,
    xHeight != null ? { r: xHeight, label: "x-height" } : null,
    { r: 0, label: "baseline" },
    desc != null ? { r: -descBottom, label: "descender" } : null,
  ].filter((g): g is { r: number; label: string } => g != null);

  return (
    <svg
      viewBox={`0 -4 200 ${H * 100 + 8}`}
      className="h-48 w-full"
      role="img"
      aria-label="Diagram of the font's baseline, x-height, cap-height, ascender and descender"
    >
      <title>Vertical metrics diagram</title>
      {guides.map((g) => {
        const y = yOf(g.r);
        return (
          <g key={g.label}>
            <line
              x1={0}
              x2={200}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth={0.5}
              strokeDasharray={g.label === "baseline" ? undefined : "2 2"}
            />
            <text
              x={198}
              y={y - 1.5}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 5 }}
            >
              {g.label}
            </text>
          </g>
        );
      })}
      {/* The specimen letters, sized to one em (100 user units) sitting on the
          baseline, so their real shapes line up with the declared guides. */}
      <text
        x={8}
        y={yOf(0)}
        style={{ ...style, fontSize: 100 }}
        className="fill-foreground"
      >
        Hxg
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
