import { type CSSProperties, Fragment, useState } from "react";
import { WEIGHT_STEPS, WIDTH_STEP_PCT, WIDTH_STEPS } from "@/lib/fonts/filter";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontAxis, FontInstance } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

const CELLS = 9;

// The standard steps the Weight and Width filters pill on, so a family picked
// from those filters shows the very step that matched it.
const STANDARD_STOPS: Record<string, number[]> = {
  wght: WEIGHT_STEPS,
  wdth: WIDTH_STEPS.map((s) => WIDTH_STEP_PCT[s]),
};

// Standard width steps are halves (62.5, 87.5), so plain rounding would
// misreport them; evenly-split axes can land anywhere, so trim the tail.
const fmt = (v: number) =>
  Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);

// Axis labels sit quiet until the pointer is on their row or column, when they
// take the secondary badge's pill. The padding is always there, so gaining the
// pill recolours the label in place rather than resizing the header.
const LABEL =
  "inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-2xs text-muted-foreground tabular-nums transition-colors duration-fast ease-snap";
const LABEL_ON = "bg-secondary font-bold text-secondary-foreground";

/**
 * The values sampled along one axis. wght and wdth snap to the same standard
 * steps the filters use, so the grid lines up with the pill that matched; a
 * family whose range omits some steps simply shows fewer cells. Every other
 * axis is split into nine even stops across its own range, having no standard.
 */
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

/**
 * The first two characters of the preview text, for the grid cells. Counted by
 * grapheme, so an emoji specimen is not cut through a surrogate pair, and with
 * whitespace dropped so a leading space does not spend one of the two slots.
 */
function firstTwo(specimen: string): string {
  const trimmed = specimen.replace(/\s+/g, "");
  // Segmenter keeps "✌️" and other multi-code-point emoji whole; [...str] would
  // split them at the variation selector.
  const chars = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(trimmed)].map((s) => s.segment)
    : [...trimmed];
  return chars.slice(0, 2).join("") || "Aa";
}

/** The distinct weights a static family ships, in order. */
function staticWeights(instances: FontInstance[]): number[] {
  const seen = new Set<number>();
  for (const inst of instances) {
    const w = inst.coords.wght;
    if (typeof w === "number") seen.add(w);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * A grid of "Aa" cells shown above the Instances list, sampling weight across
 * the columns and, when present, width down the rows.
 *
 * Variable families sample their axes at the same standard steps the Weight
 * and Width filters use, so a weight or width with no named instance is still
 * visible. Static families have no axes to sample, so the columns are simply
 * the distinct weights they ship — one row, no interpolation.
 */
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
  // Which cell the pointer is on, so its row and column labels can highlight.
  const [hover, setHover] = useState<{ c: number; r: number } | null>(null);

  const wdthAxis = axes.find((a) => a.tag === "wdth");
  // Weight drives the columns; anything else stands in when a family has no
  // wght, including wdth itself when it is the only axis.
  const col =
    axes.find((a) => a.tag === "wght") ??
    axes.find((a) => a !== wdthAxis) ??
    wdthAxis;
  // Width only earns its own rows when it is not already the column axis.
  const wdth = wdthAxis === col ? undefined : wdthAxis;

  // Other axes hold still at their defaults so the grid reads as one variable.
  const base = Object.fromEntries(
    axes
      .filter((a) => a !== col && a !== wdth)
      .map((a) => [a.tag, a.default ?? a.min ?? 0])
  );

  const staticStops = col ? [] : staticWeights(instances);
  // A lone weight has nothing to compare against; the instance list says it.
  if (!col && staticStops.length < 2) return null;

  const colTag = col?.tag ?? "wght";
  const colStops = col ? stopsFor(col) : staticStops;
  const rowStops = wdth ? stopsFor(wdth) : [null];
  const sample = firstTwo(specimen);

  return (
    // Narrow screens cannot fit nine columns at a legible size, so the grid
    // scrolls sideways instead of squeezing the glyphs until they clip. The
    // padding lives on the scroller so the last column keeps its inset.
    <div className="overflow-x-auto border-b py-8">
      <div
        className="mx-auto grid w-max min-w-full max-w-5xl gap-1.5 px-4"
        style={{
          gridTemplateColumns: `${wdth ? "minmax(5rem, auto)" : "0"} repeat(${colStops.length}, minmax(3rem, 1fr))`,
        }}
      >
        {/* Empty corner: each header below carries its own axis tag. */}
        <div aria-hidden className="sticky left-0 z-10 bg-background" />
        {colStops.map((colValue, i) => (
          <div key={`head:${colValue}`} className="pb-2 text-center">
            <span className={cn(LABEL, hover?.c === i && LABEL_ON)}>
              {/* Only the first header spells out the axis; the rest are values. */}
              {i === 0 ? `${colTag}=` : ""}
              {fmt(colValue)}
            </span>
          </div>
        ))}

        {rowStops.map((rowValue, r) => (
          <Fragment key={rowValue ?? "single"}>
            {/* Sticky so the width stays readable once the grid is scrolled. */}
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
