import { StackSimpleIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  INSTANCE_BUCKETS,
  INSTANCE_MAX,
  INSTANCE_MIN,
  instanceBucketOf,
  type InstanceRange,
  instanceRangeOf,
} from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// Instance count (how many named styles a family ships): a two-thumb range
// slider over the counts, with bucket presets below. Same shape as a metric
// row (readout, slider, quartile buttons + All); the buttons jump the slider
// to a preset range, and All clears back to no filter.
//
// The slider works in STOP INDEX space rather than raw counts. The
// distribution is extremely skewed -- 1..12 covers almost the whole catalog
// while the tail runs 14, 16, 18, 20, 32, 36, 45, 64, 72, 74 -- so on a linear
// track everything below 12 would crowd into the first sixth and be
// undraggable. Stops give each real value equal width. The stored value is
// always the real count, never the index.
export function InstancesSection({
  // [instance count, family count] ascending, from the facet index.
  histogram,
  value,
  onChange,
}: {
  histogram: [number, number][];
  value: InstanceRange | undefined;
  onChange: (next: InstanceRange | undefined) => void;
}) {
  // Every count the catalog actually has, ascending. Falls back to the domain
  // edges if the histogram is empty, so the slider still renders.
  const stops = useMemo(() => {
    const xs = histogram.map(([n]) => n).filter((n) => n > 0);
    return xs.length ? xs : [INSTANCE_MIN, INSTANCE_MAX];
  }, [histogram]);

  // Nearest stop index for a real count (thumbs only rest on a stop).
  const indexOf = (v: number) => {
    let best = 0;
    for (let i = 1; i < stops.length; i++) {
      if (Math.abs(stops[i] - v) < Math.abs(stops[best] - v)) best = i;
    }
    return best;
  };

  const [lo, hi] = value ?? [INSTANCE_MIN, INSTANCE_MAX];
  const trackValue: [number, number] = [indexOf(lo), indexOf(hi)];
  const active = instanceBucketOf(value);

  // Families in a range, summed from the histogram (no second catalog pass).
  const countIn = (rlo: number, rhi: number) =>
    histogram.reduce((sum, [n, c]) => (n >= rlo && n <= rhi ? sum + c : sum), 0);
  const matched = useMemo(() => countIn(lo, hi), [histogram, lo, hi]);

  // Store the real counts; a range spanning the whole domain filters nothing,
  // so it clears instead (keeping All lit rather than showing a no-op filter).
  const commit = (nlo: number, nhi: number) => {
    const a = Math.min(nlo, nhi);
    const b = Math.max(nlo, nhi);
    if (a <= INSTANCE_MIN && b >= INSTANCE_MAX) return onChange(undefined);
    onChange([a, b]);
  };

  const handle = (raw: number | readonly number[]) => {
    const arr = Array.isArray(raw) ? raw : [raw, raw];
    commit(stops[arr[0]] ?? INSTANCE_MIN, stops[arr[1]] ?? INSTANCE_MAX);
  };

  // A preset button jumps the slider to that bucket; clicking the active one
  // again clears, so the row never traps the user into needing All.
  const pick = (id: string) => {
    if (id === active) return onChange(undefined);
    const r = instanceRangeOf(id);
    if (r) commit(r[0], r[1]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader
        title="Instances"
        icon={StackSimpleIcon}
        info="An instance is one named style the family ships. A full family usually covers the nine standard weights (100-900), and adding a matching italic for each brings it to 18 instances. Most families are far smaller: over half of the catalog ships a single style."
        hasSelection={value != null}
        onReset={() => onChange(undefined)}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-mono text-muted-foreground">
          {lo === hi ? lo : `${lo} – ${hi}`}
        </span>
        <span className="text-muted-foreground">{matched} fonts</span>
      </div>
      <RangeSlider
        value={trackValue}
        onValueChange={handle}
        min={0}
        max={stops.length - 1}
        step={1}
        getAriaLabel={(i) => `Instance count ${i === 0 ? "minimum" : "maximum"}`}
      />
      {/* Bucket presets + All, mirroring the metric rows' quartile buttons. */}
      <div className="grid grid-cols-5 gap-1">
        {INSTANCE_BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => pick(b.id)}
            aria-pressed={active === b.id}
            title={`${countIn(b.range[0], b.range[1])} fonts`}
            className={cn(
              "flex min-h-9 items-center justify-center rounded border py-0.5 text-center font-mono text-[11px] transition-colors md:min-h-8",
              active === b.id
                ? "border-primary bg-muted font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-primary"
            )}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-pressed={value == null}
          className={cn(
            "flex min-h-9 items-center justify-center rounded border py-0.5 text-center text-[11px] transition-colors md:min-h-8",
            value == null
              ? "border-primary bg-muted font-semibold text-foreground"
              : "text-muted-foreground hover:border-foreground hover:text-foreground"
          )}
        >
          All
        </button>
      </div>
    </div>
  );
}
