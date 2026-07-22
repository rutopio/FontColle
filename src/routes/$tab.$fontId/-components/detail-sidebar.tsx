import {
  InfoIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
  ToggleRightIcon,
  XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { EditableValue } from "@/components/ui/editable-value";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_ON, featureName } from "@/lib/fonts/features";
import type { FontRecord } from "@/lib/fonts/types";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { useScrollReset } from "@/lib/use-scroll-reset";

// Preview font-size bounds, shared by the slider and the click-to-edit value so
// the two can't drift apart. Exported because the Tester's own size control
// offers the same range and presets.
export const SIZE_MIN = 12;
export const SIZE_MAX = 72;
// Preset values offered in the click-to-edit dropdown. Bounded by SIZE_MIN /
// SIZE_MAX: EditableValue filters out-of-range presets, so anything outside
// would be dead.
export const SIZE_PRESETS = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 52, 60, 72,
];
// Per-axis presets; axes without an entry just get free-form entry.
const AXIS_PRESETS: Record<string, number[]> = {
  wght: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  wdth: [50, 62.5, 75, 87.5, 100, 112.5, 125, 150, 200],
};

// A ghost Reset button for a sidebar section title. Always rendered (hidden via
// invisible+disabled while inactive) so the title row height stays constant.
function ResetButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={!active}
      aria-hidden={!active}
      className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 ${
        active ? "" : "invisible"
      }`}
    >
      <XIcon className="size-3" />
      Reset
    </button>
  );
}

// Native range input styled to match the shared shadcn Slider primitive
// (@/components/ui/slider) at its "sm" size: a muted 1.5px track with a bordered
// foreground thumb, 12px like the sidebar's other sliders (filter axes, metric
// ranges), which a 16px thumb would out-weigh in this narrow column.
// We keep the native <input type="range"> here rather than the primitive because
// that primitive hides its Thumb, and these sliders need a per-thumb aria-label
// (preserved below) plus aria-valuetext with units, which the wrapper's props
// (spread onto Root, not the Thumb) can't carry.
const RANGE_SLIDER_CLASS = [
  // my-2 reproduces the spacing the primitive gets from its Control's py-2
  // (that padding is what separates the metric sliders from their labels).
  // A margin, not padding: the input's background paints over its padding box,
  // so py-2 would just render a taller track instead of adding space around it.
  // No bg-* here: the track's background is the fill gradient set inline per
  // value (see rangeFillStyle), which a utility class would override.
  "my-2 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none",
  // WebKit thumb
  "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-foreground [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm",
  // Firefox thumb
  "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-foreground [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-sm",
  // Focus ring, matching the primitive's focus-visible treatment
  "focus-visible:[&::-webkit-slider-thumb]:ring-[3px] focus-visible:[&::-webkit-slider-thumb]:ring-ring/50",
  "focus-visible:[&::-moz-range-thumb]:ring-[3px] focus-visible:[&::-moz-range-thumb]:ring-ring/50",
].join(" ");

// The filled portion left of the thumb, standing in for the primitive's
// Indicator element (a native range input has no equivalent pseudo-element that
// both engines style, so paint it as a hard-stop gradient on the track itself).
function rangeFillStyle(
  value: number,
  min: number,
  max: number
): CSSProperties {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  return {
    background: `linear-gradient(to right, var(--color-foreground) ${clamped}%, var(--color-muted) ${clamped}%)`,
  };
}

// Class list for a feature toggle pill, highlighted when the feature is on.
function featureToggleClass(on: boolean) {
  return [
    "flex items-center justify-between gap-2.5 rounded-md border px-2.5 py-2 transition-[color,background-color,border-color,transform] hover:border-foreground active:scale-[0.97]",
    on ? "border-foreground bg-muted" : "border-border",
  ].join(" ");
}

// Detail-page side panel: the font's variable-axis sliders first (if any), then
// its OpenType features as toggle pills. Both drive the type tester via shared
// page state; feature defaults follow the browser/W3C behavior.
export function DetailSidebar({
  panelKey,
  size,
  onSizeChange,
  showSize = true,
  axes,
  axisState,
  onAxisChange,
  onResetAxes,
  showAxes = true,
  features,
  featureState,
  onToggleFeature,
  onResetFeatures,
}: {
  // Which tab's controls these are. Only used to key the panel transition, so
  // switching tabs replays the fade-and-rise instead of mutating in place.
  panelKey: string;
  size: number;
  onSizeChange: (value: number) => void;
  // Hidden on the Tester tab, whose editor sets a size per block type in
  // its own toolbar, so one shared size would control nothing.
  showSize?: boolean;
  axes: FontRecord["axes"];
  axisState: Record<string, number>;
  onAxisChange: (tag: string, value: number) => void;
  onResetAxes: () => void;
  // Hidden on the Instances tab, where every row is pinned to its own named
  // instance's coords, so a shared axis slider would control nothing.
  showAxes?: boolean;
  features: string[];
  featureState: Record<string, boolean>;
  onToggleFeature: (tag: string) => void;
  onResetFeatures: () => void;
}) {
  // Axes Reset is offered only when an axis differs from its default value.
  const axesDirty = axes.some(
    (a) => axisState[a.tag] !== (a.default ?? a.min ?? 0)
  );
  // Order: W3C default-on features first, then alphabetical within each group.
  const sorted = useMemo(
    () =>
      [...features].sort((a, b) => {
        const da = DEFAULT_ON.has(a) ? 0 : 1;
        const db = DEFAULT_ON.has(b) ? 0 : 1;
        return da - db || a.localeCompare(b);
      }),
    [features]
  );

  // Reset is offered only when some feature deviates from its W3C default.
  const dirty = features.some(
    (tag) => featureState[tag] !== DEFAULT_ON.has(tag)
  );

  // Always open at the top; don't let router scroll restoration carry the
  // sidebar's position across list <-> detail navigation.
  const viewportRef = useScrollReset<HTMLDivElement>();

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea viewportRef={viewportRef} className="min-h-0 flex-1">
        {/* Same fade-and-rise the list's FilterSidebar plays when the rail
            switches panels, keyed on the tab so a Tester <-> Instances switch
            animates. Inside the ScrollArea, so the scroll container itself
            stays put while its content swaps. */}
        <motion.div
          key={panelKey}
          className="flex flex-col gap-8 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_S.fast, ease: EASE_OUT }}
        >
          {/* gap-1.5 + the slider's my-2, matching the metric range sliders. */}
          {showSize && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
                  <TextAaIcon className="size-4" />
                  Font Size
                </h2>
                <EditableValue
                  value={size}
                  min={SIZE_MIN}
                  max={SIZE_MAX}
                  suffix="px"
                  presets={SIZE_PRESETS}
                  onChange={onSizeChange}
                  ariaLabel="Preview font size"
                />
              </div>
              <input
                type="range"
                min={SIZE_MIN}
                max={SIZE_MAX}
                value={size}
                onChange={(e) => onSizeChange(Number(e.target.value))}
                aria-label="Preview font size"
                aria-valuetext={`${size} px`}
                className={RANGE_SLIDER_CLASS}
                style={rangeFillStyle(size, SIZE_MIN, SIZE_MAX)}
              />
            </div>
          )}
          {showAxes && axes.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
                  <SlidersHorizontalIcon className="size-4" />
                  Variable axes
                </h2>
                <ResetButton
                  active={axesDirty}
                  onClick={onResetAxes}
                  label="Reset variable axes to defaults"
                />
              </div>
              <div className="flex flex-col gap-3">
                {axes.map((a) => (
                  <div key={a.tag} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      {/* The raw four-letter tag sits in an outline badge so it
                          reads as the axis's code rather than part of its
                          name. */}
                      <span className="flex items-baseline gap-1.5 text-sm">
                        {a.name ?? a.tag}
                        <Badge
                          variant="outline"
                          className="font-mono font-normal text-muted-foreground text-xs"
                        >
                          {a.tag}
                        </Badge>
                      </span>
                      <EditableValue
                        value={Math.round(axisState[a.tag])}
                        min={a.min ?? 0}
                        max={a.max ?? 100}
                        presets={AXIS_PRESETS[a.tag]}
                        onChange={(v) => onAxisChange(a.tag, v)}
                        ariaLabel={`${a.name ?? a.tag} value`}
                      />
                    </div>
                    <input
                      type="range"
                      min={a.min ?? 0}
                      max={a.max ?? 100}
                      value={axisState[a.tag]}
                      step={0.5}
                      onChange={(e) =>
                        onAxisChange(a.tag, Number(e.target.value))
                      }
                      aria-label={`${a.name ?? a.tag} axis`}
                      aria-valuetext={`${a.name ?? a.tag} ${Math.round(
                        axisState[a.tag]
                      )}`}
                      className={RANGE_SLIDER_CLASS}
                      style={rangeFillStyle(
                        axisState[a.tag],
                        a.min ?? 0,
                        a.max ?? 100
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
                <ToggleRightIcon className="size-4" />
                Features Toggle
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label="About the default toggle states"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <InfoIcon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs normal-case">
                    Each toggle starts in the state browsers apply by default
                    per the W3C CSS Fonts spec: features like liga, calt, kern
                    and ccmp are on, the rest off.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <ResetButton
                active={dirty}
                onClick={onResetFeatures}
                label="Reset OpenType features to defaults"
              />
            </div>
            {features.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                This font exposes no OpenType features.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sorted.map((tag) => {
                  const on = featureState[tag];
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggleFeature(tag)}
                      aria-pressed={on}
                      className={featureToggleClass(on)}
                    >
                      <span className="font-mono text-xs">{tag}</span>
                      <span className="flex-1 truncate text-right text-[11px] text-muted-foreground">
                        {featureName(tag)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </ScrollArea>
    </aside>
  );
}
