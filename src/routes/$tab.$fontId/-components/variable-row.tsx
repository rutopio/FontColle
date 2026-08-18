import { type CSSProperties, Fragment, useState } from "react";
import { WEIGHT_STEPS, WIDTH_STEP_PCT, WIDTH_STEPS } from "@/lib/fonts/filter";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontAxis, FontInstance } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

const CELLS = 9;

// Aligned with the Weight/Width filter steps.
const STANDARD_STOPS: Record<string, number[]> = {
  wght: WEIGHT_STEPS,
  wdth: WIDTH_STEPS.map((s) => WIDTH_STEP_PCT[s]),
};

// Trim float tail for width halves (62.5, 87.5) and evenly-split axes.
const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);

const LABEL =
  "inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-2xs text-muted-foreground tabular-nums transition-colors duration-fast ease-snap";
const LABEL_ON = "bg-secondary font-bold text-secondary-foreground";

/** wght/wdth snap to filter steps; other axes use nine even stops. */
function stopsFor(axis: FontAxis): number[] {
  const min = axis.min ?? 0;
  const max = axis.max ?? 100;
  const standard = STANDARD_STOPS[axis.tag];
  if (standard) {
    const inRange = standard.filter((s) => s >= min && s <= max);
    if (inRange.length > 0) return inRange;
  }
  return Array.from(
    { length: CELLS },
    (_, i) => min + ((max - min) * i) / (CELLS - 1)
  );
}

/** First two graphemes of the specimen (Segmenter-safe for emoji). */
function firstTwo(specimen: string): string {
  const trimmed = specimen.replace(/\s+/g, "");
  // Segmenter keeps multi-code-point emoji whole; [...str] would split them.
  const chars = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(trimmed)].map((s) => s.segment)
    : [...trimmed];
  return chars.slice(0, 2).join("") || "Aa";
}

function staticWeights(instances: FontInstance[]): number[] {
  const seen = new Set<number>();
  for (const inst of instances) {
    const w = inst.coords.wght;
    if (typeof w === "number") seen.add(w);
  }
  return [...seen].sort((a, b) => a - b);
}

export function VariableRow({
  fontName,
  axes,
  instances,
  specimen,
  italic,
  showNotdef,
}: {
  fontName: string;
  axes: FontAxis[];
  instances: FontInstance[];
  specimen: string;
  italic: boolean;
  showNotdef: boolean;
}) {
  const [hover, setHover] = useState<{ c: number; r: number } | null>(null);

  const wdthAxis = axes.find((a) => a.tag === "wdth");
  // Columns: wght preferred, then any non-wdth axis, then wdth itself.
  const col =
    axes.find((a) => a.tag === "wght") ??
    axes.find((a) => a !== wdthAxis) ??
    wdthAxis;
  const wdth = wdthAxis === col ? undefined : wdthAxis;

  const base = Object.fromEntries(
    axes
      .filter((a) => a !== col && a !== wdth)
      .map((a) => [a.tag, a.default ?? a.min ?? 0])
  );

  const staticStops = col ? [] : staticWeights(instances);
  if (!col && staticStops.length < 2) return null;

  const colTag = col?.tag ?? "wght";
  const colStops = col ? stopsFor(col) : staticStops;
  const rowStops = wdth ? stopsFor(wdth) : [null];
  const sample = firstTwo(specimen);

  return (
    <div className="overflow-x-auto border-b py-8">
      <div
        className="mx-auto grid w-max min-w-full max-w-5xl gap-1.5 px-4"
        style={{
          gridTemplateColumns: `${wdth ? "minmax(5rem, auto)" : "0"} repeat(${colStops.length}, minmax(3rem, 1fr))`,
        }}
      >
        <div aria-hidden className="sticky left-0 z-10 bg-background" />
        {colStops.map((colValue, i) => (
          <div key={`head:${colValue}`} className="pb-2 text-center">
            <span className={cn(LABEL, hover?.c === i && LABEL_ON)}>
              {i === 0 ? `${colTag}=` : ""}
              {fmt(colValue)}
            </span>
          </div>
        ))}

        {rowStops.map((rowValue, r) => (
          <Fragment key={rowValue ?? "single"}>
            <div className="sticky left-0 z-10 flex items-center justify-end bg-background pr-3">
              {rowValue != null && wdth && (
                <span className={cn(LABEL, hover?.r === r && LABEL_ON)}>
                  {r === 0 ? `${wdth.tag}=` : ""}
                  {fmt(rowValue)}
                </span>
              )}
            </div>
            {colStops.map((colValue, c) => {
              const coords: Record<string, number> = {
                ...base,
                [colTag]: colValue,
              };
              if (wdth && rowValue != null) coords.wdth = rowValue;

              const style: CSSProperties = {
                ...previewStyle({
                  name: fontName,
                  showNotdef,
                  coords,
                  italic,
                }),
                fontSize: "clamp(1rem, 3.5vw, 2rem)",
              };
              const label = wdth
                ? `${colTag} ${fmt(colValue)}, wdth ${fmt(rowValue ?? 0)}`
                : `${colTag} ${fmt(colValue)}`;
              return (
                <figure
                  key={colValue}
                  title={label}
                  onMouseEnter={() => setHover({ c, r })}
                  onMouseLeave={() =>
                    setHover((h) => (h?.c === c && h?.r === r ? null : h))
                  }
                  className="flex items-center justify-center whitespace-nowrap rounded-md px-1 py-3 leading-none transition-colors duration-fast ease-snap hover:bg-muted"
                  style={style}
                >
                  <figcaption className="sr-only">{label}</figcaption>
                  <span aria-hidden>{sample}</span>
                </figure>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
