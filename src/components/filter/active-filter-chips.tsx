import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";
import { SavePresetPopover } from "./save-preset-popover";

const CHIP_MOTION = {
  layout: "position",
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_S.fast, ease: EASE_OUT },
} as const;

export const hasActiveFilterChips = (filter: FilterState): boolean =>
  groupActiveFilters(filter).length > 0 || filter.query.trim().length > 0;

export function ActiveFilterChips({
  filter,
  onChange,
  align = "center",
  currentSearch,
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  align?: "center" | "left";
  currentSearch?: FilterSearch;
}) {
  const groups = groupActiveFilters(filter);
  const query = filter.query.trim();
  if (!hasActiveFilterChips(filter)) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        align === "center" ? "max-w-2xl justify-center" : "justify-start"
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {query && (
          <motion.button
            key="__query__"
            {...CHIP_MOTION}
            type="button"
            onClick={() => onChange({ ...filter, query: "" })}
            className="flex min-h-9 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-input px-2.5 py-2 text-left text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1"
            aria-label={`Remove search: ${query}`}
          >
            <span className="shrink-0">Search |</span>
            <span className="break-words text-foreground">{query}</span>
            <XIcon className="ml-auto size-3 shrink-0 opacity-60" />
          </motion.button>
        )}
        {groups.map((group) => (
          <motion.button
            key={group.id}
            {...CHIP_MOTION}
            type="button"
            onClick={() => onChange(group.removeAll)}
            className="flex min-h-9 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-input px-2.5 py-2 text-left text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1"
            aria-label={`Remove filter ${group.section}: ${group.values
              .map((v) => v.value)
              .join(` ${group.joiner} `)}`}
          >
            <span className="shrink-0">{group.section} |</span>
            {group.values.map((v, i) => (
              <Fragment key={v.id}>
                {i > 0 && <span>{group.joiner}</span>}
                <span className="break-words text-foreground">{v.value}</span>
              </Fragment>
            ))}
            <XIcon className="ml-auto size-3 shrink-0 opacity-60" />
          </motion.button>
        ))}
      </AnimatePresence>
      {currentSearch && (
        <SavePresetPopover filter={filter} currentSearch={currentSearch} />
      )}
    </div>
  );
}
