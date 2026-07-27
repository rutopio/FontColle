import { CaretDownIcon, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useId, useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchMode } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { RARE_THRESHOLD } from "./constants";
import { PillButton } from "./pill-button";
import { SectionHeader, type SortMode } from "./section-header";

// Rare values, below RARE_THRESHOLD or outside a given top-N, collapse behind
// a "more" expander.
export function Section({
  title,
  icon,
  items,
  selected,
  onToggle,
  onReset,
  sortable = true,
  grid,
  spread,
  label,
  expandAll,
  topNSet,
  numericSort,
  mode,
  onToggleMode,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset?: () => void;
  sortable?: boolean;
  mode?: MatchMode;
  onToggleMode?: () => void;
  grid?: boolean;
  spread?: boolean;
  // The toggle still passes the raw value.
  label?: (value: string) => string;
  expandAll?: boolean;
  // Overrides RARE_THRESHOLD: only these show by default.
  topNSet?: Set<string> | null;
  // Sort the non-count mode numerically, for values like units-per-em where
  // "1000" must rank above "16", not below it.
  numericSort?: boolean;
}) {
  const [sort, setSort] = useState<SortMode>("count");

  const sorted = useMemo(() => {
    if (sort === "alpha") {
      return [...items].sort((a, b) =>
        numericSort ? Number(b[0]) - Number(a[0]) : a[0].localeCompare(b[0])
      );
    }
    return items;
  }, [items, sort, numericSort]);

  const hasSelection =
    !!onReset && items.some(([value]) => selected.includes(value));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        icon={icon}
        hasSelection={hasSelection}
        onReset={() => onReset?.()}
        canSort={sortable && items.length > 1}
        sort={sort}
        onToggleSort={() => setSort((s) => (s === "count" ? "alpha" : "count"))}
        numericSort={numericSort}
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <Pills
        items={sorted}
        selected={selected}
        onToggle={onToggle}
        grid={grid}
        spread={spread}
        label={label}
        expandAll={expandAll}
        topNSet={topNSet}
      />
    </div>
  );
}

// Exported so a panel with several sub-lists under one header can reuse the
// rare-value collapsing without nesting SectionHeaders.
export function Pills({
  items,
  selected,
  onToggle,
  grid,
  spread,
  mono,
  label,
  title,
  columns = 3,
  topNSet,
  expandAll,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  grid?: boolean;
  spread?: boolean;
  // For four-letter tags like "liga", not human labels like "Latin".
  mono?: boolean;
  label?: (value: string) => string;
  // Empty string suppresses the tooltip for that value.
  title?: (value: string) => string;
  columns?: 2 | 3;
  // Overrides RARE_THRESHOLD. Selected values outside it are pulled up.
  topNSet?: Set<string> | null;
  expandAll?: boolean;
}) {
  const [showRare, setShowRare] = useState(false);
  // Names the collapsed rare row so the toggle's aria-expanded has a target.
  const rareId = useId();

  const isRare = ([value, count]: [string, number]) => {
    if (expandAll) return false;
    if (topNSet) {
      return !topNSet.has(value) && (showRare || !selected.includes(value));
    }
    return count < RARE_THRESHOLD && (showRare || !selected.includes(value));
  };
  const common = items.filter((it) => !isRare(it));
  const rare = items.filter(isRare);

  const renderPill = ([value, count]: [string, number]) => {
    const tip = title?.(value);
    const pill = (
      <PillButton
        value={value}
        count={count}
        label={label ? label(value) : value}
        selected={selected.includes(value)}
        onToggle={onToggle}
        spread={!!spread}
        mono={mono}
        // Equal-width grid cells, each free to shrink and clip its label. Under
        // a tooltip trigger the pill fills the wrapper rather than the cell.
        className={cn(grid && "min-w-0", tip && "w-full")}
      />
    );
    if (!tip) return <Fragment key={value}>{pill}</Fragment>;
    return (
      <Tooltip key={value}>
        {/* Trigger is a wrapper (not the pill's own <button>, which can't nest a
            second button, and not display:contents, which has no box for base-ui
            to position the popup against). The wrapper takes the grid/flex
            item's place and the pill fills it, so layout is unchanged. */}
        <TooltipTrigger
          render={(props) => (
            <div {...props} className={cn("flex", grid && "min-w-0")}>
              {pill}
            </div>
          )}
        />
        <TooltipContent className="normal-case">{tip}</TooltipContent>
      </Tooltip>
    );
  };

  // Both column classes are spelled out: Tailwind can't see interpolated ones.
  const rowClass = grid
    ? columns === 2
      ? "grid grid-cols-2 gap-1.5"
      : "grid grid-cols-3 gap-1.5"
    : "flex flex-wrap gap-1.5";

  return (
    <div className="flex flex-col gap-2">
      <div className={rowClass}>{common.map(renderPill)}</div>
      {rare.length > 0 && (
        <>
          {/* Motion collapses the rare row by animating height auto <-> 0;
              overflow-hidden clips the content while it slides. The id sits on
              this always-mounted wrapper rather than the motion child, so the
              toggle's aria-controls resolves while the row is collapsed. */}
          <div id={rareId}>
            <AnimatePresence initial={false}>
              {showRare && (
                <motion.div
                  key="rare"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className={rowClass}>{rare.map(renderPill)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setShowRare((v) => !v)}
            aria-expanded={showRare}
            aria-controls={rareId}
            className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          >
            <CaretDownIcon
              aria-hidden="true"
              className={cn(
                "size-3 transition-transform",
                showRare && "rotate-180"
              )}
            />
            {showRare ? "Show less" : `${rare.length} more`}
          </button>
        </>
      )}
    </div>
  );
}
