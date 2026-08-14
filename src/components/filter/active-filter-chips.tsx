import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { usePreview } from "@/lib/preview/context";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";
import { SavePresetPopover } from "./save-preset-popover";

const CHIP_CLASS =
  "flex min-h-9 max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-input px-2.5 py-2 text-left text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1";

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
  const { text: previewText, coverOnly, setCoverOnly } = usePreview();
  // The coverage chip stands on its own: it shows whenever there is preview
  // text, even with no filter or search active.
  if (!(hasActiveFilterChips(filter) || previewText.trim())) return null;
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
            className={CHIP_CLASS}
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
            className={CHIP_CLASS}
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
        {/* The coverage filter reads as a condition on the list, so it sits
            with the other chips — but it toggles between two states rather
            than being removed, which is why it carries no ✕. */}
        {previewText.trim() && (
          <motion.button
            key="__coverage__"
            {...CHIP_MOTION}
            type="button"
            onClick={() => setCoverOnly(!coverOnly)}
            aria-label={
              coverOnly
                ? "Hiding fonts that cannot render the preview text. Show every font"
                : "Showing every font. Hide the ones that cannot render the preview text"
            }
            className={CHIP_CLASS}
          >
            <span className="shrink-0">Preview Text |</span>
            <span className="text-foreground">
              {coverOnly ? "Hide Missing" : "Show All"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      {currentSearch && (
        <SavePresetPopover filter={filter} currentSearch={currentSearch} />
      )}
    </div>
  );
}
