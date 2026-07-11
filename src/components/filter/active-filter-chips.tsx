import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";

// Each chip fades in on add and out on remove; `layout` slides the survivors
// into the freed space so the row reflows smoothly.
const CHIP_MOTION = {
  layout: true,
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: "easeOut" },
} as const;

// The active filter conditions, each a removable chip. Rendered both at the top
// of the results list (left-aligned) and in the empty state (centered), so a
// user can see exactly which conditions are stacked and lift them one at a time.
export function ActiveFilterChips({
  filter,
  onChange,
  align = "center",
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  // "center" caps the width for the empty state; "left" fills the list header.
  align?: "center" | "left";
}) {
  const groups = groupActiveFilters(filter);
  if (groups.length === 0) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        align === "center" ? "max-w-2xl justify-center" : "justify-start"
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map((group) => (
          <motion.button
            key={group.id}
            {...CHIP_MOTION}
            type="button"
            onClick={() => onChange(group.removeAll)}
            className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
            aria-label={`Remove filter ${group.section}: ${group.values
              .map((v) => v.value)
              .join(` ${group.joiner} `)}`}
          >
            <span className="opacity-60">{group.section}</span>
            {/* Values joined by the section's combine word; the joiner is muted
                like the section label and flips with the OR/AND toggle. */}
            {group.values.map((v, i) => (
              <Fragment key={v.id}>
                {i > 0 && <span className="opacity-60">{group.joiner}</span>}
                <span className="text-foreground">{v.value}</span>
              </Fragment>
            ))}
            <XIcon className="size-3 opacity-60" />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
