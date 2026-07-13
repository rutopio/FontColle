import {
  SlidersHorizontalIcon,
  TextAaIcon,
  ToggleRightIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { EditableValue } from "@/components/ui/editable-value";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_ON, featureName } from "@/lib/fonts/features";
import type { FontRecord } from "@/lib/fonts/types";
import { useScrollReset } from "@/lib/use-scroll-reset";

// Preset values offered in the click-to-edit dropdown. Starts at the size min
// (16) — smaller values would be filtered out by EditableValue as out-of-range,
// so listing them here is dead. Top values are clamped to max (200) at commit.
const SIZE_PRESETS = [16, 18, 20, 24, 28, 32, 36, 40, 48, 52, 60, 72, 100, 160, 200];
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

// Class list for a feature toggle pill, highlighted when the feature is on.
function featureToggleClass(on: boolean) {
  return [
    "flex items-center justify-between gap-2.5 rounded-md border px-2.5 py-2 transition-colors hover:border-foreground",
    on ? "border-foreground bg-muted" : "border-border",
  ].join(" ");
}

// Detail-page side panel: the font's variable-axis sliders first (if any), then
// its OpenType features as toggle pills. Both drive the type tester via shared
// page state; feature defaults follow the browser/W3C behavior.
export function DetailSidebar({
  size,
  onSizeChange,
  axes,
  axisState,
  onAxisChange,
  onResetAxes,
  features,
  featureState,
  onToggleFeature,
  onResetFeatures,
}: {
  size: number;
  onSizeChange: (value: number) => void;
  axes: FontRecord["axes"];
  axisState: Record<string, number>;
  onAxisChange: (tag: string, value: number) => void;
  onResetAxes: () => void;
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
        <div className="flex flex-col gap-8 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
                <TextAaIcon className="size-4" />
                Font Size
              </h2>
              <EditableValue
                value={size}
                min={16}
                max={200}
                suffix="px"
                presets={SIZE_PRESETS}
                onChange={onSizeChange}
                ariaLabel="Preview font size"
              />
            </div>
            <input
              type="range"
              min={16}
              max={200}
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              aria-label="Preview font size"
              className="w-full accent-foreground"
            />
          </div>
          {axes.length > 0 && (
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
                  <div key={a.tag} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm">
                        {a.name ?? a.tag}
                        <span className="ml-1.5 font-mono text-muted-foreground text-xs">
                          {a.tag}
                        </span>
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
                      className="w-full accent-foreground"
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
                OpenType features
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
        </div>
      </ScrollArea>
    </aside>
  );
}
