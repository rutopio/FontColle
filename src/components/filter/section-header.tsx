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
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";

const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_S.fast, ease: EASE_OUT },
} as const;

export type SortMode = "count" | "alpha";

// Renders nothing without a note, so a section opts in by passing one.
// Separate from SectionHeader because Category draws its own header.
export function InfoTip({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={`About ${title}`}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <InfoIcon className="size-3.5" />
      </TooltipTrigger>
      {/* normal-case: section titles are uppercased, the note must not be. */}
      <TooltipContent className="max-w-xs normal-case">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

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

export function SortToggle({
  sort,
  onToggle,
  numeric,
}: {
  sort: SortMode;
  onToggle: () => void;
  // Numeric values sort largest-first, not A–Z; label it accordingly.
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

// Rendered only for sections that pass a mode, i.e. where both rules mean
// something.
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

// The action slot always renders, invisible when empty, so a Reset appearing
// on first selection doesn't shift every section below it down by a row.
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
  flashKey,
}: {
  title: string;
  icon: Icon;
  hasSelection: boolean;
  onReset: () => void;
  canSort: boolean;
  sort: SortMode;
  onToggleSort: () => void;
  numericSort?: boolean;
  info?: React.ReactNode;
  mode?: MatchMode;
  onToggleMode?: () => void;
  // Bumps each time a sibling section's mutually-exclusive pick silently
  // cleared this one's selection. 0 = never flashed.
  flashKey?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <motion.h2
        key={flashKey}
        initial={flashKey ? { color: "var(--color-amber-500)" } : false}
        animate={{ color: "var(--color-primary)" }}
        // 0.9s, deliberately outside the motion scale: a one-shot colour hint,
        // not a UI transition, so it has to outlast the glance that follows a
        // sibling section clearing this one's selection.
        transition={{ duration: 0.9, ease: EASE_OUT }}
        // min-w-0 + truncate: the action slot is shrink-0, so without this the
        // title is the only flexible item and wraps to a second line the moment
        // a selection adds the Any/All toggle beside Reset.
        className="flex min-w-0 items-center gap-1.5 font-medium text-primary text-sm uppercase"
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{title}</span>
        <InfoTip title={title}>{info}</InfoTip>
      </motion.h2>
      <div className="flex shrink-0 items-center gap-0.5">
        {/* OR/AND toggle, left of the reset/sort slot. Only for sections that
            pass a mode, and only once something is selected, combining is
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
