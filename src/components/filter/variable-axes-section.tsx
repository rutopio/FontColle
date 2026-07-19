import { CaretDownIcon, type Icon, InfoIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { EditableValue } from "@/components/ui/editable-value";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axesData from "@/data/axes.json";
import type { MatchMode } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// Official display name + description per axis tag, from Google Fonts'
// axisregistry (see scripts/gen-axes-data.mjs). Tags not in the registry
// (mostly newer or vendor-specific axes) render with no info icon.
const AXES: Record<
  string,
  {
    name: string;
    description: string;
    // axes.json also carries `fallbacks` (the axis's named stops). Not declared
    // here because this panel only shows the description; the detail page's Use
    // tab still reads them (see routes/$tab.$fontId/-components/use/shared).
  }
> = axesData;

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
  mode,
  onToggleMode,
  flashKey,
}: {
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  sliderValue: Record<string, number>;
  onSliderChange: (tag: string, pct: number) => void;
  disabled?: boolean;
  mode?: MatchMode;
  onToggleMode?: () => void;
  // Bumped when the axis selection was cleared by a Weight/Width pick (see
  // FilterSidebar), so the header flashes to hint at the swap.
  flashKey?: number;
}) {
  const [showMore, setShowMore] = useState(false);
  // Names the collapsed tail row so the toggle's aria-expanded has a target.
  const tailId = useId();
  const hasSelection = items.some(([value]) => selected.includes(value));

  // Grouping is by count only, never by selection, so selecting an axis in the
  // expanded tail never reorders the list, the pill plays its shrink animation
  // in place. The top N always show; the rest live behind the expander.
  const common = useMemo(() => items.slice(0, TOP_N), [items]);
  const rare = useMemo(() => items.slice(TOP_N), [items]);

  // When collapsed, a selected axis from the tail would otherwise vanish. Pin
  // those below the top rows (not inside the collapsing region) so the choice
  // stays visible. Empty while expanded, the tail already shows them in place.
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
        <motion.button
          type="button"
          onClick={() => onToggle(tag)}
          disabled={disabled}
          // Motion animates flex-basis (the pill shrinks to 1/3 when selected,
          // expanding back to full when cleared); border/background stay CSS
          // transitions since they're color micro-changes, not layout.
          initial={false}
          animate={{ flexBasis: on ? "33.333333%" : "100%" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            // Height matches PillButton: taller tap target on mobile, compact
            // on desktop.
            "flex min-h-9 min-w-0 flex-1 items-center justify-between gap-1 rounded-md border px-2.5 py-2 text-xs transition-[border-color,background-color] duration-200 ease-out md:min-h-0 md:py-1",
            disabled && "cursor-not-allowed",
            on ? "border-primary bg-muted" : "border-input",
            !disabled && !on && "hover:border-foreground/40"
          )}
        >
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono text-foreground">{tag}</span>
            {/* The full name fades out once selected: the pill shrinks to 1/3
                to make room for the slider, too narrow to hold it. Weight also
                eases via the variable font's wght axis (Inter Variable) so the
                brief moment before it fades reads as regular -> semibold, not a
                hard font-weight jump. */}
            {info ? (
              <span
                className={cn(
                  "truncate text-muted-foreground text-xs transition-[font-variation-settings,opacity] duration-200 ease-out",
                  on
                    ? "opacity-0 [font-variation-settings:'wght'_600]"
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
        </motion.button>
        {/* Sibling of the pill button, never nested inside it: TooltipTrigger
                  renders its own <button>, and a <button> inside the pill's
                  <button> would be invalid HTML and would double-fire onToggle. */}
        {/* Unmounted once the axis is selected (not just faded): opacity-0 still
                  reserved its box + the row's gap, narrowing the slider. Gone
                  now, so the slider gets the full freed width. */}
        {info && !on ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={`About ${info.name}`}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <InfoIcon className="size-3.5" />
            </TooltipTrigger>
            {/* Description only. The axis's named stops (wght's Thin 100 …
                Black 900 and friends) used to be listed underneath, but on the
                common axes that runs to nine entries and buries the sentence
                that actually explains what the axis does. The slider reads as a
                relative percent anyway, so the exact named values weren't
                helping it. */}
            <TooltipContent className="max-w-xs normal-case">
              {info.description}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {/* Always mounted so both directions animate: the pill's flex-basis
                  and this container's flex-basis transition together (the pill
                  shrinks / expands, this grows / collapses), while opacity fades
                  the slider in behind the shrink (delay) and out ahead of the
                  push-back. pointer-events-none keeps it inert while hidden. */}
        {/* Motion animates flex-basis + opacity + padding opposite the pill:
            it grows from 0 to 2/3 and fades in as the pill shrinks. The fade
            trails the shrink on select (opacity delay) and leads the push-back
            on clear (shorter duration), matching the original hand-tuned feel. */}
        <motion.div
          initial={false}
          animate={{
            flexBasis: on ? "66.666667%" : "0%",
            paddingLeft: on ? "0.625rem" : "0rem",
            paddingRight: on ? "0.625rem" : "0rem",
            opacity: on ? 1 : 0,
          }}
          transition={{
            duration: on ? 0.2 : 0.15,
            ease: "easeOut",
            opacity: on
              ? { duration: 0.2, ease: "easeOut", delay: 0.05 }
              : { duration: 0.15, ease: "easeOut" },
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-xs",
            !on && "pointer-events-none"
          )}
        >
          <Slider
            size="sm"
            value={pct}
            onValueChange={(v) => onSliderChange(tag, v as number)}
            min={0}
            max={100}
            className="[&_[data-slot=slider-control]]:py-0"
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
        </motion.div>
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
        mode={mode}
        onToggleMode={onToggleMode}
        flashKey={flashKey}
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
            {/* Motion collapses the rare tail by animating height auto <-> 0;
                overflow-hidden clips it while closed. The id sits on this
                always-mounted wrapper rather than the motion child, so the
                toggle's aria-controls resolves while the tail is collapsed. */}
            <div id={tailId}>
              <AnimatePresence initial={false}>
                {showMore && (
                  <motion.div
                    key="tail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5">
                      {rare.map(renderRow)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Selected tail axes, kept visible below the top rows while the
                tail is collapsed. */}
            {pinned.map(renderRow)}
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              aria-controls={tailId}
              className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            >
              <CaretDownIcon
                aria-hidden="true"
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
