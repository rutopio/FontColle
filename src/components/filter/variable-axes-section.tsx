import { type Icon, InfoIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { EditableValue } from "@/components/ui/editable-value";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axesData from "@/data/axes.json";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// Official display name + description per axis tag, from Google Fonts'
// axisregistry (see scripts/gen-axes-data.mjs). Tags not in the registry
// (mostly newer or vendor-specific axes) render with no info icon.
const AXES: Record<string, { name: string; description: string }> = axesData;

const TOP_N = 4;
// Relative-position presets offered in the editable % readout's dropdown.
const PCT_PRESETS = [0, 25, 50, 75, 100];

// Variable axes: always the top 4 by font count, one full-width pill per row.
// Selecting a pill animates it shrinking to a third of the row, then fades in a
// relative-position slider (0-100%, default 50) in the freed space, driving the
// live preview. The slider is always mounted (faded out when unselected) so the
// width animation and fade can play; it's a sibling of the pill, not nested in
// it (its thumb is a native <input type="range">, illegal inside a <button>),
// so dragging can never also toggle the pill. No sort toggle or "more" expander
// — this section is meant to stay small (see Section for the general pill-list
// pattern).
//
// `disabled` fades the list out under Font type = Static: only variable fonts
// have axes. Picking Static also clears the axis selection (see FilterSidebar),
// so the sliders are always collapsed by the time this renders disabled.
export function VariableAxesSection({
  icon,
  items,
  selected,
  onToggle,
  onReset,
  sliderValue,
  onSliderChange,
  disabled = false,
}: {
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  sliderValue: Record<string, number>;
  onSliderChange: (tag: string, pct: number) => void;
  disabled?: boolean;
}) {
  const top = useMemo(() => items.slice(0, TOP_N), [items]);
  const hasSelection = top.some(([value]) => selected.includes(value));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Variable axes"
        icon={icon}
        hasSelection={hasSelection}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div
        className={cn(
          "flex flex-col gap-1.5 transition-opacity",
          disabled && "opacity-40"
        )}
      >
        {top.map(([tag, count]) => {
          const on = selected.includes(tag);
          const pct = sliderValue[tag] ?? 50;
          const info = AXES[tag];

          return (
            <div key={tag} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggle(tag)}
                disabled={disabled}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-xs transition-[flex-basis,border-color,background-color] duration-200 ease-out",
                  disabled && "cursor-not-allowed",
                  on
                    ? "basis-1/3 border-primary bg-muted"
                    : "basis-full border-input",
                  !disabled && !on && "hover:border-foreground/40"
                )}
              >
                <span className="truncate font-mono text-foreground">
                  {tag}
                </span>
                <span className="font-mono text-muted-foreground opacity-60">
                  {count}
                </span>
              </button>
              {/* Sibling of the pill button, never nested inside it: TooltipTrigger
                  renders its own <button>, and a <button> inside the pill's
                  <button> would be invalid HTML and would double-fire onToggle. */}
              {info ? (
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label={`About ${info.name}`}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <InfoIcon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs normal-case tracking-normal">
                    <span className="font-semibold">{info.name}</span>:{" "}
                    {info.description}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {/* Always mounted so both directions animate: the pill's flex-basis
                  and this container's flex-basis transition together (the pill
                  shrinks / expands, this grows / collapses), while opacity fades
                  the slider in behind the shrink (delay) and out ahead of the
                  push-back. pointer-events-none keeps it inert while hidden. */}
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-xs transition-[flex-basis,opacity] duration-200 ease-out",
                  on
                    ? "basis-2/3 px-2.5 opacity-100 delay-[50ms]"
                    : "pointer-events-none basis-0 px-0 opacity-0 duration-150"
                )}
              >
                <Slider
                  value={pct}
                  onValueChange={(v) => onSliderChange(tag, v as number)}
                  min={0}
                  max={100}
                  className="[&_[data-slot=slider-control]]:py-0 [&_[data-slot=slider-thumb]]:size-3"
                />
                {/* Fixed-width, right-aligned so the slider track doesn't shift
                    as the % readout changes digit count (5% -> 100%). */}
                <span className="flex w-10 shrink-0 justify-end">
                  <EditableValue
                    value={Math.round(pct)}
                    min={0}
                    max={100}
                    suffix="%"
                    presets={PCT_PRESETS}
                    onChange={(v) => onSliderChange(tag, v)}
                    ariaLabel={`${tag} relative position`}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
