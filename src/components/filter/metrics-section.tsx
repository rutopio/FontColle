import { RulerIcon, TextTIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  isRangeActive,
  METRIC_ORDER,
  type MetricKey,
  type MetricRange,
  type MetricSpec,
  specForCatalog,
} from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

// Metrics tab: six derived-value range sliders plus two boolean pills. Each
// slider is inactive when both thumbs rest on the domain edges (it filters
// nothing then), and stores only active ranges in the filter/URL. Snap (upm)
// and log (fileSize) scales are mapped to/from the slider's track here so the
// stored value is always the real metric value.

// Humanize a byte count for the fileSize readout.
function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}MB`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}

// Format one thumb value for a metric's readout.
function formatValue(key: MetricKey, v: number): string {
  if (key === "fileSize") return humanBytes(v);
  if (key === "upm") return String(Math.round(v));
  return v.toFixed(2);
}

// Slider-track coordinates for a metric. Linear metrics map straight through;
// fileSize works in log10(bytes); upm is an index into its sorted values.
interface TrackMap {
  min: number;
  max: number;
  step: number;
  // metric value -> track position and back.
  toTrack: (v: number) => number;
  fromTrack: (t: number) => number;
}

function trackMap(spec: MetricSpec, upmValues: number[]): TrackMap {
  if (spec.scale === "log") {
    const lg = (v: number) => Math.log10(v);
    return {
      min: lg(spec.min),
      max: lg(spec.max),
      // ~120 steps across the log range for smooth dragging.
      step: (lg(spec.max) - lg(spec.min)) / 120,
      toTrack: lg,
      fromTrack: (t) => 10 ** t,
    };
  }
  if (spec.scale === "snap") {
    return {
      min: 0,
      max: Math.max(0, upmValues.length - 1),
      step: 1,
      // Nearest index for a given upm value (defaults to 0 when absent).
      toTrack: (v) => {
        const i = upmValues.indexOf(v);
        return i >= 0 ? i : 0;
      },
      fromTrack: (t) => upmValues[Math.round(t)] ?? spec.min,
    };
  }
  return {
    min: spec.min,
    max: spec.max,
    step: spec.step,
    toTrack: (v) => v,
    fromTrack: (t) => t,
  };
}

function MetricRangeRow({
  spec,
  value,
  upmValues,
  onChange,
}: {
  spec: MetricSpec;
  // The current stored range, or undefined when the slider is at full extent.
  value: MetricRange | undefined;
  upmValues: number[];
  onChange: (next: MetricRange | undefined) => void;
}) {
  const map = useMemo(() => trackMap(spec, upmValues), [spec, upmValues]);
  const [lo, hi] = value ?? [spec.min, spec.max];
  const trackValue: [number, number] = [map.toTrack(lo), map.toTrack(hi)];

  const handle = (raw: number | readonly number[]) => {
    const arr = Array.isArray(raw) ? raw : [raw, raw];
    const nlo = map.fromTrack(arr[0]);
    const nhi = map.fromTrack(arr[1]);
    // Clamp back into the metric domain so log/rounding drift can't leak past
    // the edges, then drop the range entirely when it's inactive.
    const range: MetricRange = [
      Math.max(spec.min, Math.min(nlo, spec.max)),
      Math.max(spec.min, Math.min(nhi, spec.max)),
    ];
    onChange(isRangeActive(spec, range) ? range : undefined);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-foreground">{spec.label}</span>
        <span className="font-mono text-muted-foreground">
          {formatValue(spec.key, lo)} – {formatValue(spec.key, hi)}
        </span>
      </div>
      <RangeSlider
        value={trackValue}
        onValueChange={handle}
        min={map.min}
        max={map.max}
        step={map.step}
        getAriaLabel={(i) => `${spec.label} ${i === 0 ? "minimum" : "maximum"}`}
      />
    </div>
  );
}

export function MetricsSection({
  metrics,
  upmValues,
  onMetricChange,
  onReset,
  isMonospace,
  hasHinting,
  monoCount,
  hintCount,
  onToggleMonospace,
  onToggleHinting,
}: {
  metrics: Partial<Record<MetricKey, MetricRange>>;
  upmValues: number[];
  onMetricChange: (key: MetricKey, next: MetricRange | undefined) => void;
  onReset: () => void;
  isMonospace: boolean;
  hasHinting: boolean;
  monoCount: number;
  hintCount: number;
  onToggleMonospace: () => void;
  onToggleHinting: () => void;
}) {
  const hasSelection =
    Object.keys(metrics).length > 0 || isMonospace || hasHinting;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <SectionHeader
          title="Metrics"
          icon={RulerIcon}
          hasSelection={hasSelection}
          onReset={onReset}
          canSort={false}
          sort="count"
          onToggleSort={() => {}}
        />
        <div className="flex flex-col gap-4">
          {METRIC_ORDER.map((key) => (
            <MetricRangeRow
              key={key}
              spec={specForCatalog(key, upmValues)}
              value={metrics[key]}
              upmValues={upmValues}
              onChange={(next) => onMetricChange(key, next)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Traits"
          icon={TextTIcon}
          hasSelection={isMonospace || hasHinting}
          onReset={() => {
            if (isMonospace) onToggleMonospace();
            if (hasHinting) onToggleHinting();
          }}
          canSort={false}
          sort="count"
          onToggleSort={() => {}}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <PillButton
            value="monospace"
            label="Monospace"
            count={monoCount}
            selected={isMonospace}
            onToggle={onToggleMonospace}
            className="min-w-0"
          />
          <PillButton
            value="hinted"
            label="Hinted"
            count={hintCount}
            selected={hasHinting}
            onToggle={onToggleHinting}
            className="min-w-0"
          />
        </div>
      </div>
    </div>
  );
}
