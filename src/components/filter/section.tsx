import { CaretDownIcon, type Icon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { RARE_THRESHOLD } from "./constants";
import { SectionHeader, type SortMode } from "./section-header";

// A pill-list filter section: a header (title + reset/sort) over a Pills list.
// Used for Properties and Variable axes. Rare values (below RARE_THRESHOLD, or
// outside the top-N when set) collapse behind a "more" expander.
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
  topN,
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
  // When set, show only the top N items by count (instead of RARE_THRESHOLD).
  topN?: number;
}) {
  const [sort, setSort] = useState<SortMode>("count");

  const sorted = useMemo(() => {
    if (sort === "alpha") {
      return [...items].sort((a, b) => a[0].localeCompare(b[0]));
    }
    return items;
  }, [items, sort]);

  // Pre-compute the set of top-N values by count so Pills can use it
  // regardless of current sort order.
  const topNSet = useMemo(
    () => (topN != null ? new Set(items.slice(0, topN).map(([v]) => v)) : null),
    [items, topN]
  );

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
        topNSet={topNSet}
      />
    </div>
  );
}

function Pills({
  items,
  selected,
  onToggle,
  grid,
  spread,
  topNSet,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  grid?: boolean;
  spread?: boolean;
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

  const renderPill = ([value, count]: [string, number]) => {
    const on = selected.includes(value);
    return (
      <button
        key={value}
        type="button"
        onClick={() => onToggle(value)}
        className={cn(
          "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
          spread ? "justify-between" : "justify-center",
          // Equal-width three-per-row: let each cell shrink and clip its label.
          grid && "min-w-0",
          on
            ? "border-foreground bg-foreground text-background"
            : "text-muted-foreground hover:border-foreground hover:text-foreground"
        )}
      >
        <span className={cn("truncate", spread && "font-mono")}>{value}</span>
        <span className="font-mono opacity-60">{count}</span>
      </button>
    );
  };

  // Grid mode lays pills out three-per-row at equal width; otherwise they wrap.
  const rowClass = grid ? "grid grid-cols-3 gap-1.5" : "flex flex-wrap gap-1.5";

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
