import { StackSimpleIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import {
  INSTANCE_BUCKETS,
  INSTANCE_MAX,
  INSTANCE_MIN,
  type InstanceRange,
  instanceBucketOf,
  instanceRangeOf,
} from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// Slider tracks histogram stop indices, not raw counts (skewed distribution).
export function InstancesSection({
  histogram,
  value,
  onChange,
}: {
  histogram: [number, number][];
  value: InstanceRange | undefined;
  onChange: (next: InstanceRange | undefined) => void;
}) {
  const stops = useMemo(() => {
    const xs = histogram.map(([n]) => n).filter((n) => n > 0);
    return xs.length ? xs : [INSTANCE_MIN, INSTANCE_MAX];
  }, [histogram]);

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

  const countIn = (rlo: number, rhi: number) =>
    histogram.reduce(
      (sum, [n, c]) => (n >= rlo && n <= rhi ? sum + c : sum),
      0
    );
  const matched = countIn(lo, hi);

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
        info="An instance is one named style the family ships. A full family covers the nine standard weights (100-900); with matching italics, that's 18 instances. Most families are far smaller: over half the catalog ships a single style."
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
      <Slider
        value={trackValue}
        onChange={handle}
        min={0}
        max={stops.length - 1}
        step={1}
        showValue={false}
        label="Instance count"
      />
      <div className="grid grid-cols-5 gap-1">
        {INSTANCE_BUCKETS.map((b) => (
          <Tooltip
            key={b.id}
            content={`${countIn(b.range[0], b.range[1])} fonts`}
            side="bottom"
            className="font-mono normal-case"
          >
            <button
              type="button"
              onClick={() => pick(b.id)}
              aria-pressed={active === b.id}
              className={cn(
                "flex min-h-9 items-center justify-center rounded border py-0.5 text-center font-mono text-2xs transition-colors md:min-h-8",
                active === b.id
                  ? "border-primary bg-muted font-semibold text-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {b.label}
            </button>
          </Tooltip>
        ))}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-pressed={value == null}
          className={cn(
            "flex min-h-9 items-center justify-center rounded border py-0.5 text-center text-2xs transition-colors md:min-h-8",
            value == null
              ? "border-primary bg-muted font-semibold text-foreground"
              : "text-foreground hover:bg-muted"
          )}
        >
          All
        </button>
      </div>
    </div>
  );
}
