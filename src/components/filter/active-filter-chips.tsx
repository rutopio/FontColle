import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";
import { SavePresetPopover } from "./save-preset-popover";

// Each chip fades in on add and out on remove; `layout="position"` slides the
// survivors into the freed space so the row reflows smoothly.
//
// "position", not true: a multi-value section is ONE chip whose width grows as
// values are added (Latin -> Latin OR Greek). `layout: true` animates size too,
// which motion does by tweening a scaleX on the box — that visibly stretches the
// text inside for a frame before it settles. Animating position only lets the
// chip jump straight to its real width (no text distortion) while its neighbours
// still glide into place.
const CHIP_MOTION = {
  layout: "position",
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_S.fast, ease: EASE_OUT },
} as const;

// The active filter conditions, each a removable chip. Rendered both at the top
// of the results list (left-aligned) and in the empty state (centered), so a
// user can see exactly which conditions are stacked and lift them one at a time.
export function ActiveFilterChips({
  filter,
  onChange,
  align = "center",
  currentSearch,
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  // "center" caps the width for the empty state; "left" fills the list header.
  align?: "center" | "left";
  // Pass to offer "Save to Preset" as the row's last item. Omitted in the empty
  // state, where a filter matching nothing isn't worth saving.
  currentSearch?: FilterSearch;
}) {
  const groups = groupActiveFilters(filter);
  // The text query is deliberately kept out of describeActiveFilters (it has its
  // own input, and activeFilterCount/filterKey exclude it). But it's still an
  // active condition, and with results showing it's the only one without a chip.
  // Fold it in here as a lead chip so both the list header and the empty state
  // surface it; removing it clears the query like any other section.
  const query = filter.query.trim();
  // The empty state ("center") collapses outright: there is no grid under it to
  // shift, so an unmount costs nothing.
  if (groups.length === 0 && !query && align === "center") return null;
  // In the list ("left") the row stays mounted even while empty, and animates
  // its own height instead. Unmounting it meant the first chip mounted a fresh
  // AnimatePresence — `initial: false` only suppresses children added to an
  // existing container, so that chip still faded in — and the row's height went
  // 0 -> ~28px in one frame, snapping the grid down under it. Keeping the
  // container alive fixes the flash; animating height turns the push into a
  // transition. Collapsed it is height 0 with no margin, so it takes up nothing.
  const filled = groups.length > 0 || query.length > 0;
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
      // Both directions are instant. In the list the caller drives this row off
      // the committed (deferred) filter, so any height change lands while the
      // results are faded to opacity 0 — the row snaps to its new size unseen and
      // is already in place when the list fades back in. An animated open/close
      // here would instead play a visible 200ms push against the fading list.
      transition={{ duration: 0 }}
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
