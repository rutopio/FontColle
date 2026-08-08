import {
  InfoIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
  ToggleRightIcon,
  XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { EditableValue } from "@/components/ui/editable-value";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { useScrollReset } from "@/hooks/use-scroll-reset";
import { DEFAULT_ON, featureName } from "@/lib/fonts/features";
import type { FontRecord } from "@/lib/fonts/types";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { useBlockAxes } from "@/lib/tester/block-axes";

export const SIZE_MIN = 12;
export const SIZE_MAX = 72;
export const SIZE_PRESETS = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 52, 60, 72,
];
const AXIS_PRESETS: Record<string, number[]> = {
  wght: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  wdth: [50, 62.5, 75, 87.5, 100, 112.5, 125, 150, 200],
};

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
      className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 ${
        active ? "" : "invisible"
      }`}
    >
      <XIcon className="size-3" />
      Reset
    </button>
  );
}

// Wider axes use whole steps; narrow ones (e.g. slnt) use halves.
function axisStep(min: number, max: number): number {
  return max - min > 50 ? 1 : 0.5;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function featureToggleClass(on: boolean) {
  return [
    "flex items-center justify-between gap-2.5 rounded-md border px-2.5 py-2 transition-[color,background-color,border-color,transform] duration-fast ease-snap hover:border-foreground active:scale-[0.97]",
    on ? "border-primary bg-muted" : "border-input",
  ].join(" ");
}

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
  panelKey: string;
  size: number;
  onSizeChange: (value: number) => void;
  showSize?: boolean;
  axes: FontRecord["axes"];
  axisState: Record<string, number>;
  onAxisChange: (tag: string, value: number) => void;
  onResetAxes: () => void;
  showAxes?: boolean;
  features: string[];
  featureState: Record<string, boolean>;
  onToggleFeature: (tag: string) => void;
  onResetFeatures: () => void;
}) {
  const axesDirty = axes.some(
    (a) => axisState[a.tag] !== (a.default ?? a.min ?? 0)
  );

  // Tester axes follow the selected block; other tabs use page-wide preview.
  const blockAxesCtx = useBlockAxes();
  const blockTarget = blockAxesCtx?.target ?? null;
  const axesDisabled = blockAxesCtx != null && blockTarget == null;
  const sorted = useMemo(
    () =>
      [...features].sort((a, b) => {
        const da = DEFAULT_ON.has(a) ? 0 : 1;
        const db = DEFAULT_ON.has(b) ? 0 : 1;
        return da - db || a.localeCompare(b);
      }),
    [features]
  );

  const dirty = features.some(
    (tag) => featureState[tag] !== DEFAULT_ON.has(tag)
  );

  const viewportRef = useScrollReset<HTMLDivElement>();

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-foreground">
      <ScrollArea fade viewportRef={viewportRef} className="min-h-0 flex-1">
        <motion.div
          key={panelKey}
          className="flex flex-col gap-8 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_S.fast, ease: EASE_OUT }}
        >
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
              <Slider
                label="Preview font size"
                min={SIZE_MIN}
                max={SIZE_MAX}
                value={size}
                onChange={(v) => onSizeChange(v as number)}
                showValue={false}
                tooltipSide="bottom"
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
                  active={axesDirty && blockAxesCtx == null}
                  onClick={onResetAxes}
                  label="Reset variable axes to defaults"
                />
              </div>
              {axesDisabled && (
                <p className="text-muted-foreground text-xs">
                  Select a line to adjust its axes.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {axes.map((a) => {
                  const min = a.min ?? 0;
                  const max = a.max ?? 100;
                  const step = axisStep(min, max);
                  const value = blockTarget
                    ? (blockTarget.coords[a.tag] ?? axisState[a.tag])
                    : axisState[a.tag];
                  const setValue = blockTarget
                    ? (v: number) => blockTarget.setAxis(a.tag, v)
                    : (v: number) => onAxisChange(a.tag, v);
                  return (
                    <div key={a.tag} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
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
                          value={roundToStep(value, step)}
                          min={min}
                          max={max}
                          presets={AXIS_PRESETS[a.tag]}
                          onChange={setValue}
                          ariaLabel={`${a.name ?? a.tag} value`}
                        />
                      </div>
                      <Slider
                        label={`${a.name ?? a.tag} axis`}
                        min={min}
                        max={max}
                        value={value}
                        step={step}
                        onChange={(v) => setValue(v as number)}
                        disabled={axesDisabled}
                        showValue={false}
                        tooltipSide="bottom"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
                <ToggleRightIcon className="size-4" />
                Features Toggle
                <Tooltip
                  content="Each toggle starts in the state browsers apply by default per the W3C CSS Fonts spec: features like liga, calt, kern and ccmp are on, the rest off."
                  className="max-w-xs normal-case"
                >
                  <button
                    type="button"
                    aria-label="About the default toggle states"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <InfoIcon className="size-3.5" />
                  </button>
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
                      <span className="flex-1 truncate text-right text-2xs text-muted-foreground">
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
