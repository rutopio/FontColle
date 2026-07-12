import {
  ArrowsDownUpIcon,
  type Icon,
  InfoIcon,
  IntersectIcon,
  UniteIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchMode } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// Shared fade for header actions that swap in/out (Reset <-> Sort). Fast and
// subtle — it should read as a soft cross-fade, not a spotlight.
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: "easeOut" },
} as const;

// Per-section pill ordering: by font count (default) or alphabetically.
export type SortMode = "count" | "alpha";

// Shared small button used in section headers: a compact, monospaced action.
export function HeaderButton({
  onClick,
  label,
  children,
  className,
  "aria-hidden": ariaHidden,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : undefined}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        className
      )}
    >
      {children}
    </button>
  );
}

// A count/alpha sort toggle for a pill section header. Rendered only when the
// section has more than one value (nothing to reorder otherwise).
export function SortToggle({
  sort,
  onToggle,
  numeric,
}: {
  sort: SortMode;
  onToggle: () => void;
  // The values are numeric: the non-count mode sorts by value (largest first),
  // so label it accordingly rather than as an A–Z name sort.
  numeric?: boolean;
}) {
  const byValueLabel = numeric ? "value" : "name";
  return (
    <HeaderButton
      onClick={onToggle}
      label={`Sort by ${sort === "count" ? "count" : byValueLabel}, click to change`}
    >
      <ArrowsDownUpIcon className="size-3" />
      {sort === "count" ? "123" : numeric ? "9–0" : "A–Z"}
    </HeaderButton>
  );
}

// A ghost OR/AND toggle for a multi-select section: Unite = match any (OR),
// Intersect = match all (AND). Sits left of the reset/sort slot; rendered only
// for sections that pass a mode (the ones where both rules are meaningful).
export function MatchModeToggle({
  mode,
  onToggle,
}: {
  mode: MatchMode;
  onToggle: () => void;
}) {
  const isAny = mode === "any";
  return (
    <HeaderButton
      onClick={onToggle}
      label={`Match ${isAny ? "any (OR)" : "all (AND)"}, click to change`}
    >
      {isAny ? (
        <UniteIcon className="size-3.5" />
      ) : (
        <IntersectIcon className="size-3.5" />
      )}
      {isAny ? "Any" : "All"}
    </HeaderButton>
  );
}

// A section header with a title and a right-side action that flips between a
// Reset button (when values are selected) and a SortToggle (when not). The
// action slot always renders (invisible when neither applies) so its height
// is reserved up front — otherwise a Reset button appearing on first
// selection shifts every section below it down by a row.
export function SectionHeader({
  title,
  icon: Icon,
  hasSelection,
  onReset,
  canSort,
  sort,
  onToggleSort,
  numericSort,
  info,
  mode,
  onToggleMode,
}: {
  title: string;
  icon: Icon;
  hasSelection: boolean;
  onReset: () => void;
  canSort: boolean;
  sort: SortMode;
  onToggleSort: () => void;
  // Label the sort toggle for numeric values (largest-first) rather than A–Z.
  numericSort?: boolean;
  // Optional explanatory note shown in a tooltip behind an info icon after the
  // title. Used where the grouping could be misread (e.g. Language by continent).
  info?: React.ReactNode;
  // OR/AND toggle: pass both to show it (multi-select sections only). The
  // toggle sits left of the reset/sort slot and is always visible when passed.
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
        <Icon className="size-4" />
        {title}
        {info ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={`About ${title}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <InfoIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs normal-case">
              {info}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </h2>
      <div className="flex shrink-0 items-center gap-0.5">
        {/* OR/AND toggle, left of the reset/sort slot. Only for sections that
            pass a mode, and only once something is selected — combining is
            moot with zero or one pick, so it appears alongside Reset. Fades
            with the same timing as the Reset/Sort slot so the two never look
            like they animate on different clocks. */}
        <AnimatePresence initial={false}>
          {mode && onToggleMode && hasSelection ? (
            <motion.div key="mode" {...FADE}>
              <MatchModeToggle mode={mode} onToggle={onToggleMode} />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {/* Reserve the action slot's height/width up front with an invisible
          Reset, then cross-fade the live action (Reset <-> Sort) over it so a
          button appearing on first selection never shifts the layout. */}
        <div className="relative shrink-0">
          <HeaderButton
            onClick={() => {}}
            label=""
            aria-hidden
            className="invisible"
          >
            <XIcon className="size-3" />
            Reset
          </HeaderButton>
          <AnimatePresence initial={false} mode="popLayout">
            {hasSelection ? (
              <motion.div
                key="reset"
                {...FADE}
                className="absolute inset-y-0 right-0"
              >
                <HeaderButton onClick={onReset} label={`Reset ${title}`}>
                  <XIcon className="size-3" />
                  Reset
                </HeaderButton>
              </motion.div>
            ) : canSort ? (
              <motion.div
                key="sort"
                {...FADE}
                className="absolute inset-y-0 right-0"
              >
                <SortToggle
                  sort={sort}
                  onToggle={onToggleSort}
                  numeric={numericSort}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
