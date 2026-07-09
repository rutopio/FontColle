import { CaretDownIcon, type Icon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { RARE_THRESHOLD } from "./constants";
import { PillButton } from "./pill-button";
import { SectionHeader, type SortMode } from "./section-header";

// A pill-list filter section: a header (title + reset/sort) over a Pills list.
// Used for Properties. Rare values (below RARE_THRESHOLD, or outside the
// top-N when set) collapse behind a "more" expander.
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
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset?: () => void;
  sortable?: boolean;
  grid?: boolean;
  spread?: boolean;
}) {
  const [sort, setSort] = useState<SortMode>("count");

  const sorted = useMemo(() => {
    if (sort === "alpha") {
      return [...items].sort((a, b) => a[0].localeCompare(b[0]));
    }
    return items;
  }, [items, sort]);

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
      />
      <Pills
        items={sorted}
        selected={selected}
        onToggle={onToggle}
        grid={grid}
        spread={spread}
      />
    </div>
  );
}

// The pill list on its own, without a section header. Exported so a panel that
// renders several labelled sub-lists under one header (the features panel) can
// reuse the rare-value collapsing without nesting SectionHeaders.
export function Pills({
  items,
  selected,
  onToggle,
  grid,
  spread,
  mono,
  label,
  columns = 3,
  topNSet,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  grid?: boolean;
  spread?: boolean;
  // Render the value in a monospaced face — right for four-letter tags like
  // "liga", wrong for human labels like "Latin".
  mono?: boolean;
  // Display name for a value; the toggle still passes the raw value.
  label?: (value: string) => string;
  // Cells per row in grid mode.
  columns?: 2 | 3;
  // When provided, only values in this set are shown by default (instead of
  // using RARE_THRESHOLD). Selected values outside the set are pulled up.
  topNSet?: Set<string> | null;
}) {
  const [showRare, setShowRare] = useState(false);

  const isRare = ([value, count]: [string, number]) => {
    if (topNSet) {
      return !topNSet.has(value) && (showRare || !selected.includes(value));
    }
    return count < RARE_THRESHOLD && (showRare || !selected.includes(value));
  };
  const common = items.filter((it) => !isRare(it));
  const rare = items.filter(isRare);

  const renderPill = ([value, count]: [string, number]) => (
    <PillButton
      key={value}
      value={value}
      count={count}
      label={label ? label(value) : value}
      selected={selected.includes(value)}
      onToggle={onToggle}
      spread={!!spread}
      mono={mono}
      // Equal-width cells in grid mode: let each one shrink and clip its label.
      className={cn(grid && "min-w-0")}
    />
  );

  // Grid mode lays pills out N-per-row at equal width; otherwise they wrap.
  // Both column classes are spelled out — Tailwind can't see interpolated ones.
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
          {/* Animate the rare row open/closed by transitioning grid rows
              0fr -> 1fr. The inner wrapper needs overflow-hidden so the
              collapsed content is clipped rather than spilling out. */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              showRare ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className={rowClass}>{rare.map(renderPill)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRare((v) => !v)}
            className="flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          >
            <CaretDownIcon
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
