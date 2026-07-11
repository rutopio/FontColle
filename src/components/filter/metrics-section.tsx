import {
  BoundingBoxIcon,
  GitCommitIcon,
  GridFourIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { EditableValue } from "@/components/ui/editable-value";
import { RangeSlider } from "@/components/ui/range-slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatMetricValue,
  isRangeActive,
  METRIC_ORDER,
  METRIC_SPECS,
  type MetricKey,
  type MetricRange,
  type MetricSpec,
  quartileRanges,
  rangesEqual,
} from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { PillButton } from "./pill-button";
import { Section } from "./section";
import { SectionHeader } from "./section-header";

// The units-per-em values shown as pills by default; every other value in the
// catalog collapses behind the "N more" expander. Fixed list, not top-N by
// count, so these four are always the visible ones.
const UPM_DEFAULT = new Set(["1000", "2048", "1024", "2000"]);

// Metrics tab: six derived-value range sliders plus two boolean pills. Each
// slider is inactive when both thumbs rest on the domain edges (it filters
// nothing then), and stores only active ranges in the filter/URL. Snap (upm)
// and log (fileSize) scales are mapped to/from the slider's track here so the
// stored value is always the real metric value.

// Round a value to the metric's step so the editable readout shows a clean
// number (0.46, not 0.4640000001) and the field round-trips losslessly.
function roundTo(v: number, step: number): number {
  const inv = 1 / step;
  return Math.round(v * inv) / inv;
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

function trackMap(spec: MetricSpec): TrackMap {
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
  onChange,
}: {
  spec: MetricSpec;
  // The current stored range, or undefined when the slider is at full extent.
  value: MetricRange | undefined;
  onChange: (next: MetricRange | undefined) => void;
}) {
  const map = useMemo(() => trackMap(spec), [spec]);
  const quartiles = useMemo(() => quartileRanges(spec), [spec]);
  const [lo, hi] = value ?? [spec.min, spec.max];
  const trackValue: [number, number] = [map.toTrack(lo), map.toTrack(hi)];

  // Clamp a range into the domain, then store it (or clear it when inactive).
  const commit = (nlo: number, nhi: number) => {
    const range: MetricRange = [
      Math.max(spec.min, Math.min(nlo, spec.max)),
      Math.max(spec.min, Math.min(nhi, spec.max)),
    ];
    onChange(isRangeActive(spec, range) ? range : undefined);
  };

  const handle = (raw: number | readonly number[]) => {
    const arr = Array.isArray(raw) ? raw : [raw, raw];
    commit(map.fromTrack(arr[0]), map.fromTrack(arr[1]));
  };

  // A quartile pill jumps the slider to that quartile's range; clicking the
  // one already selected clears it back to full extent.
  const pickQuartile = (q: MetricRange) => {
    if (value && rangesEqual(value, q)) onChange(undefined);
    else commit(q[0], q[1]);
  };
  // fileSize's readout stays a humanized text (KB/MB); ratios are editable.
  const editable = spec.scale !== "log";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="text-foreground">{spec.label}</span>
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={`About ${spec.label}`}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <InfoIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs normal-case tracking-normal">
              {spec.hint}
            </TooltipContent>
          </Tooltip>
        </span>
        {editable ? (
          <span className="flex items-baseline gap-1 font-mono text-muted-foreground">
            <EditableValue
              value={roundTo(lo, spec.step)}
              min={spec.min}
              max={hi}
              presets={spec.quantiles}
              onChange={(v) => commit(v, hi)}
              ariaLabel={`${spec.label} minimum`}
            />
            <span>–</span>
            <EditableValue
              value={roundTo(hi, spec.step)}
              min={lo}
              max={spec.max}
              presets={spec.quantiles}
              onChange={(v) => commit(lo, v)}
              ariaLabel={`${spec.label} maximum`}
            />
          </span>
        ) : (
          <span className="font-mono text-muted-foreground">
            {formatMetricValue(spec.key, lo)} – {formatMetricValue(spec.key, hi)}
          </span>
        )}
      </div>
      <RangeSlider
        value={trackValue}
        onValueChange={handle}
        min={map.min}
        max={map.max}
        step={map.step}
        getAriaLabel={(i) => `${spec.label} ${i === 0 ? "minimum" : "maximum"}`}
      />
      {/* Quartile quick-select: each pill sets the slider to a range holding
          ~1/4 of the catalog (Q1 = smallest, Q4 = largest). */}
      <div className="grid grid-cols-4 gap-1">
        {quartiles.map((q, i) => {
          const active = value != null && rangesEqual(value, q);
          return (
            <Tooltip
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-quartile list
              key={i}
            >
              {/* The quartile pill is itself the trigger — no nested button —
                  so base-ui merges its hover/focus onto this <button> while
                  keeping our onClick. */}
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => pickQuartile(q)}
                    aria-pressed={active}
                    className={cn(
                      "rounded border py-0.5 text-center text-[11px] transition-colors",
                      active
                        ? "border-primary bg-muted font-semibold text-foreground"
                        : "text-muted-foreground hover:border-foreground hover:text-foreground"
                    )}
                  >
                    Q{i + 1}
                  </button>
                }
              />
              <TooltipContent className="font-mono normal-case tracking-normal">
                {formatMetricValue(spec.key, q[0])} –{" "}
                {formatMetricValue(spec.key, q[1])}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export function MetricsSection({
  metrics,
  onMetricChange,
  onReset,
}: {
  metrics: Partial<Record<MetricKey, MetricRange>>;
  onMetricChange: (key: MetricKey, next: MetricRange | undefined) => void;
  onReset: () => void;
}) {
  const hasSelection = Object.keys(metrics).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Metrics"
        icon={GitCommitIcon}
        hasSelection={hasSelection}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      {/* Six slider rows — the sub-items inside this one section, so gap-8;
          the Metrics/Units/Hint sections themselves are spaced by the sidebar's
          gap-12, not here. */}
      <div className="flex flex-col gap-8">
        {METRIC_ORDER.map((key) => (
          <MetricRangeRow
            key={key}
            spec={METRIC_SPECS[key]}
            value={metrics[key]}
            onChange={(next) => onMetricChange(key, next)}
          />
        ))}
      </div>
    </div>
  );
}

// Units-per-em pills. A thin wrapper over the shared Section so the sidebar can
// place it as a sibling of Metrics/Hint (own gap-12), with the upm-specific
// default pill set and numeric sort baked in.
export function UnitsPerEmSection({
  upmCounts,
  selectedUpm,
  onToggleUpm,
  onResetUpm,
}: {
  upmCounts: [string, number][];
  selectedUpm: string[];
  onToggleUpm: (value: string) => void;
  onResetUpm: () => void;
}) {
  return (
    <Section
      title="Units per em"
      icon={BoundingBoxIcon}
      items={upmCounts}
      selected={selectedUpm}
      onToggle={onToggleUpm}
      onReset={onResetUpm}
      topNSet={UPM_DEFAULT}
      numericSort
    />
  );
}

// Hint radio (Hinted / No Hinted), a standalone section.
export function HintSection({
  hasHinting,
  hintedCount,
  unhintedCount,
  onSetHinting,
}: {
  hasHinting: boolean | undefined;
  hintedCount: number;
  unhintedCount: number;
  onSetHinting: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Hint"
        icon={GridFourIcon}
        hasSelection={hasHinting !== undefined}
        onReset={() => {
          if (hasHinting !== undefined) onSetHinting(hasHinting);
        }}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <PillButton
          value="hinted"
          label="Hinted"
          count={hintedCount}
          selected={hasHinting === true}
          onToggle={() => onSetHinting(true)}
          className="min-w-0"
        />
        <PillButton
          value="no-hinted"
          label="No Hinted"
          count={unhintedCount}
          selected={hasHinting === false}
          onToggle={() => onSetHinting(false)}
          className="min-w-0"
        />
      </div>
    </div>
  );
}
