import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import type { FilterState } from "@/lib/fonts/filter";
import { MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";

// Each chip fades in on add and out on remove; `layout` slides the survivors
// into the freed space so the row reflows smoothly.
const CHIP_MOTION = {
  layout: true,
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_S.fast, ease: "easeOut" },
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
  // The empty state ("center") collapses outright: there is no grid under it to
  // shift, so an unmount costs nothing.
  if (groups.length === 0 && align === "center") return null;
  // In the list ("left") the row stays mounted even while empty, and animates
  // its own height instead. Unmounting it meant the first chip mounted a fresh
  // AnimatePresence — `initial: false` only suppresses children added to an
  // existing container, so that chip still faded in — and the row's height went
  // 0 -> ~28px in one frame, snapping the grid down under it. Keeping the
  // container alive fixes the flash; animating height turns the push into a
  // transition. Collapsed it is height 0 with no margin, so it takes up nothing.
  const filled = groups.length > 0;
  return (
    <motion.div
      // `height: auto` rather than a fixed value, so a wrapped second row of
      // chips animates to its real height too.
      //
      // The parent list is `flex flex-col gap-4 md:gap-6`, so this row is a flex
      // child even at height 0 and still contributes a full gap — which sat
      // under the header and pushed the grid permanently down once the row
      // stopped unmounting. Collapsing marginBottom by the same amount cancels
      // that gap, restoring the original spacing when there are no chips.
      animate={{
        height: filled ? "auto" : 0,
        marginBottom: filled ? 0 : "calc(var(--chip-row-gap) * -1)",
      }}
      initial={false}
      // Asymmetric on purpose: opening animates, so the grid is pushed down
      // rather than snapping. Closing is instant — an animated collapse drags
      // the whole list upward for 200ms after the chip is already gone, which
      // reads as the page lurching rather than as the row tidying itself away.
      transition={{ duration: filled ? MOTION_S.base : 0, ease: "easeOut" }}
      // The chips would otherwise paint outside the collapsed box mid-animation.
      style={{ overflow: "hidden" }}
      className={cn(
        // --chip-row-gap mirrors the parent's gap-4 / md:gap-6 so the negative
        // margin above cancels exactly, at both breakpoints.
        "flex flex-wrap gap-1.5 [--chip-row-gap:1rem] md:[--chip-row-gap:1.5rem]",
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
            // flex-wrap + max-w-full: a group with several values (say four
            // languages) is one chip of N inline spans, which on a phone grows
            // past the viewport and blows out the row rather than flowing into
            // it. Wrapping keeps a long group inside the container and lets it
            // spill onto its own second line, so the row still reads as chips
            // flowing left-to-right. Height matches PillButton: taller tap
            // target on mobile, compact on desktop.
            className="flex min-h-9 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-input px-2.5 py-2 text-left text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1"
            aria-label={`Remove filter ${group.section}: ${group.values
              .map((v) => v.value)
              .join(` ${group.joiner} `)}`}
          >
            {/* shrink-0 keeps the section label whole on the first line; it
                names the chip, so it should never be the part that wraps. */}
            <span className="shrink-0 opacity-60">{group.section} |</span>
            {/* Values joined by the section's combine word; the joiner is muted
                like the section label and flips with the OR/AND toggle. */}
            {group.values.map((v, i) => (
              <Fragment key={v.id}>
                {i > 0 && <span className="opacity-60">{group.joiner}</span>}
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
    </motion.div>
  );
}
