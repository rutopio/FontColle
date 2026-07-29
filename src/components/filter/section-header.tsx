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
  flashKey?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <motion.h2
        key={flashKey}
        initial={flashKey ? { color: "var(--color-amber-500)" } : false}
        animate={{ color: "var(--color-primary)" }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
        className="flex min-w-0 items-center gap-1.5 font-medium text-primary text-sm uppercase"
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{title}</span>
        <InfoTip title={title}>{info}</InfoTip>
      </motion.h2>
      <div className="flex shrink-0 items-center gap-0.5">
        <AnimatePresence initial={false}>
          {mode && onToggleMode && hasSelection ? (
            <motion.div key="mode" {...FADE}>
              <MatchModeToggle mode={mode} onToggle={onToggleMode} />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {/* Invisible placeholder reserves layout space for the action slot. */}
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
