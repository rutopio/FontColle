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
  if (groups.length === 0 && !query && align === "center") return null;
  const filled = groups.length > 0 || query.length > 0;
  return (
    <motion.div
      animate={{
        height: filled ? "auto" : 0,
        marginBottom: filled ? 0 : "calc(var(--chip-row-gap) * -1)",
      }}
      initial={false}
      transition={{ duration: 0 }}
      style={{ overflow: "hidden" }}
      className={cn(
        // Inset by 1px so chip borders aren't clipped during height collapse.
        "-mx-px -mt-px p-px",
        "flex flex-wrap gap-1.5 [--chip-row-gap:1rem] md:[--chip-row-gap:1.5rem]",
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
      {currentSearch && filled && (
        <SavePresetPopover filter={filter} currentSearch={currentSearch} />
      )}
    </motion.div>
  );
}
