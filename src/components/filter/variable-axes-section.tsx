import { CaretDownIcon, type Icon, InfoIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { EditableValue } from "@/components/ui/editable-value";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import axesData from "@/data/axes.json";
import type { MatchMode } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { useCollapseAnchor } from "./use-collapse-anchor";

const AXES: Record<
  string,
  {
    name: string;
    description: string;
  }
> = axesData;

const TOP_N = 4;
const PCT_PRESETS = [0, 25, 50, 75, 100];

// Sibling layout: range inputs can't live inside buttons.
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
  flashKey?: number;
}) {
  const [showMore, setShowMore] = useState(false);
  const tailId = useId();
  const { ref: moreToggleRef, anchor } = useCollapseAnchor();
  const hasSelection = items.some(([value]) => selected.includes(value));

  const common = useMemo(() => items.slice(0, TOP_N), [items]);
  const rare = useMemo(() => items.slice(TOP_N), [items]);

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
          aria-pressed={on}
          initial={false}
          animate={{ flexBasis: on ? "33.333333%" : "100%" }}
          transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
          className={cn(
            "flex min-h-9 min-w-0 flex-1 items-center justify-between gap-1 rounded-md border px-2.5 py-2 text-xs transition-[border-color,background-color] duration-fast ease-snap md:min-h-8 md:py-1",
            disabled && "cursor-not-allowed",
            on ? "border-primary bg-muted" : "border-input",
            !disabled && !on && "hover:bg-muted hover:text-primary"
          )}
        >
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono text-foreground">{tag}</span>
            {info ? (
              <span
                className={cn(
                  "truncate text-muted-foreground text-xs transition-[font-variation-settings,opacity] duration-fast ease-snap",
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
        {info && !on ? (
          <Tooltip content={info.description} className="max-w-xs normal-case">
            <button
              type="button"
              aria-label={`About ${info.name}`}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <InfoIcon className="size-3.5" />
            </button>
          </Tooltip>
        ) : null}
        <motion.div
          initial={false}
          animate={{
            flexBasis: on ? "66.666667%" : "0%",
            paddingLeft: on ? "0.625rem" : "0rem",
            paddingRight: on ? "0.625rem" : "0rem",
            opacity: on ? 1 : 0,
          }}
          transition={{
            duration: on ? MOTION_S.base : MOTION_S.fast,
            ease: EASE_OUT,
            opacity: on
              ? { duration: MOTION_S.base, ease: EASE_OUT, delay: 0.05 }
              : { duration: MOTION_S.fast, ease: EASE_OUT },
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-xs",
            !on && "pointer-events-none"
          )}
        >
          <Slider
            value={pct}
            onChange={(v) => onSliderChange(tag, v as number)}
            min={0}
            max={100}
            showValue={false}
            hideHoverTooltip
            label={`${tag} relative position`}
            className="min-w-0 flex-1"
          />
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
            <div id={tailId}>
              <AnimatePresence initial={false}>
                {showMore && (
                  <motion.div
                    key="tail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5">
                      {rare.map(renderRow)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {pinned.map(renderRow)}
            <button
              type="button"
              ref={moreToggleRef}
              onClick={() => {
                if (showMore) anchor();
                setShowMore((v) => !v);
              }}
              aria-expanded={showMore}
              aria-controls={tailId}
              className={cn(
                "flex w-fit items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
                showMore ? "mt-1" : "-mt-0.5"
              )}
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
