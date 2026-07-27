import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";
import { SavePresetPopover } from "./save-preset-popover";

// Chips fade in and out, and `layout="position"` slides the survivors into the
// freed space. "position", not true: a multi-value section is ONE chip whose
// width grows as values are added, and `layout: true` tweens that as a scaleX,
// visibly stretching the text for a frame before it settles.
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
  // Omitted in the empty state, where a filter matching nothing isn't worth
  // saving.
  currentSearch?: FilterSearch;
}) {
  const groups = groupActiveFilters(filter);
  // describeActiveFilters excludes the text query, which is still a condition.
  const query = filter.query.trim();
  if (groups.length === 0 && !query && align === "center") return null;
  // In the list the row stays mounted even while empty and animates its own
  // height. It must not unmount: a fresh AnimatePresence would fade in the
  // first chip (`initial: false` only suppresses children added to an existing
  // container) and the row's height would snap the grid down in one frame.
  const filled = groups.length > 0 || query.length > 0;
  return (
    <motion.div
      // `height: auto` so a wrapped second row of chips animates to its real
      // height. The parent is a flex column with a gap, so this row still
      // contributes one at height 0; collapsing marginBottom cancels it.
      animate={{
        height: filled ? "auto" : 0,
        marginBottom: filled ? 0 : "calc(var(--chip-row-gap) * -1)",
      }}
      initial={false}
      // Instant both ways: the caller drives this row off the committed
      // (deferred) filter, so a height change lands while the results are faded
      // out and is already in place when they fade back in. Animating it would
      // play a visible push against the fading list instead.
      transition={{ duration: 0 }}
      style={{ overflow: "hidden" }}
      className={cn(
        // --chip-row-gap mirrors the parent's gap-4 / md:gap-6 so the negative
        // margin above cancels exactly, at both breakpoints.
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
            {/* No opacity here: the chip is already text-muted-foreground and
                the value beside it is text-foreground, so the hierarchy comes
                from that pair. Dimming this further pushed it to 2.2:1, well
                under the AA floor for text. */}
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
            // flex-wrap + max-w-full: a multi-value group is one chip of N
            // inline spans, which on a phone would grow past the viewport and
            // blow out the row instead of spilling onto a second line. Height
            // matches PillButton, for the same tap target.
            className="flex min-h-9 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-input px-2.5 py-2 text-left text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1"
            aria-label={`Remove filter ${group.section}: ${group.values
              .map((v) => v.value)
              .join(` ${group.joiner} `)}`}
          >
            {/* shrink-0 keeps the section label whole on the first line; it
                names the chip, so it should never be the part that wraps. */}
            <span className="shrink-0">{group.section} |</span>
            {/* Values joined by the section's combine word; the joiner is muted
                like the section label and flips with the OR/AND toggle. */}
            {group.values.map((v, i) => (
              <Fragment key={v.id}>
                {i > 0 && <span>{group.joiner}</span>}
                <span className="break-words text-foreground">{v.value}</span>
              </Fragment>
            ))}
            {/* ml-auto pins the X to the trailing edge even when the values
                wrap, so it stays the chip's last element instead of drifting
                into the middle of a wrapped line. */}
            <XIcon className="ml-auto size-3 shrink-0 opacity-60" />
          </motion.button>
        ))}
      </AnimatePresence>
      {/* Outside AnimatePresence: it is a persistent action, not a condition, so
          it must not mount/unmount with the chips or take part in their
          popLayout shuffle. Rendered only when something is actually filtered,
          which is also the only time this row is visible in the list. */}
      {currentSearch && filled && (
        <SavePresetPopover filter={filter} currentSearch={currentSearch} />
      )}
    </motion.div>
  );
}
