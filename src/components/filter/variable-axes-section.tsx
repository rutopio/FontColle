import { CaretDownIcon, type Icon, InfoIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
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

// Variable axes, one full-width pill per row, count-sorted. The top 4 show by
// default; the rest collapse behind a "more" expander. Selecting a tail axis
// never reorders the list (it animates in place); collapsing the tail pins any
// selected tail axes just below the top rows so the choice stays visible.
// Selecting a pill animates it shrinking to a third of the row, then fades in a
// relative-position slider (0-100%, default 50) in the freed space, driving the
// live preview. The slider is always mounted (faded out when unselected) so the
// width animation and fade can play; it's a sibling of the pill, not nested in
// it (its thumb is a native <input type="range">, illegal inside a <button>),
// so dragging can never also toggle the pill.
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
  const [showMore, setShowMore] = useState(false);
  const hasSelection = items.some(([value]) => selected.includes(value));

  // Grouping is by count only, never by selection, so selecting an axis in the
  // expanded tail never reorders the list — the pill plays its shrink animation
  // in place. The top N always show; the rest live behind the expander.
  const common = useMemo(() => items.slice(0, TOP_N), [items]);
  const rare = useMemo(() => items.slice(TOP_N), [items]);

  // When collapsed, a selected axis from the tail would otherwise vanish. Pin
  // those below the top rows (not inside the collapsing region) so the choice
  // stays visible. Empty while expanded — the tail already shows them in place.
  const pinned = useMemo(
    () => (showMore ? [] : rare.filter(([tag]) => selected.includes(tag))),
    [rare, selected, showMore]
  );

  const renderRow = ([tag, count]: [string, number]) => {
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
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono text-foreground">{tag}</span>
            {/* Weight eases via the variable font's wght axis (Inter Variable)
                so selecting fades regular -> semibold, not a hard font-weight
                jump. */}
            {info ? (
              <span
                className={cn(
                  "truncate text-muted-foreground text-xs transition-[font-variation-settings] duration-200 ease-out",
                  on
                    ? "[font-variation-settings:'wght'_600]"
                    : "[font-variation-settings:'wght'_400]"
                )}
              >
                {info.name}
              </span>
            ) : null}
          </span>
          <span className="font-mono text-muted-foreground opacity-60">
            {count}
          </span>
        </button>
        {/* Sibling of the pill button, never nested inside it: TooltipTrigger
                  renders its own <button>, and a <button> inside the pill's
                  <button> would be invalid HTML and would double-fire onToggle. */}
        {/* Fades out once the axis is selected: the slider takes over the
                  row, and the description has already served its purpose. */}
        {info ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={`About ${info.name}`}
              className={cn(
                "shrink-0 text-muted-foreground transition-[color,opacity] hover:text-foreground",
                on && "pointer-events-none opacity-0"
              )}
            >
              <InfoIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs normal-case tracking-normal">
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
  };

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
        {common.map(renderRow)}
        {rare.length > 0 && (
          <>
            {/* Collapse the rare tail by animating grid rows 0fr -> 1fr; the
                inner wrapper needs overflow-hidden so it clips while closed. */}
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                showMore ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="flex flex-col gap-1.5">
                  {rare.map(renderRow)}
                </div>
              </div>
            </div>
            {/* Selected tail axes, kept visible below the top rows while the
                tail is collapsed. */}
            {pinned.map(renderRow)}
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            >
              <CaretDownIcon
                className={cn(
                  "size-3 transition-transform",
                  showMore && "rotate-180"
                )}
              />
              {showMore ? "Show less" : `${rare.length} more`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
