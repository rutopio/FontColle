import { cn } from "@/lib/utils";

// A segmented control for radio-style filters: the options share one border and
// sit flush against each other, so the group physically reads as one mutually
// exclusive choice — apart from the multi-select pills, which stay as separate
// rounded-md boxes with gaps. Clicking the active segment clears it.
//
// Replaces the two-per-row PillButton grid the either/or filters used (Variable
// Support, Italic, Color, Noto Family). Selecting a segment fills it; the count
// rides along muted so the label stays the emphasis.
export function SegmentedPills({
  items,
  labels,
  selected,
  onToggle,
}: {
  // [value, count], in display order.
  items: [string, number][];
  // value -> human label; falls back to the raw value.
  labels: Record<string, string>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex rounded-md border">
      {items.map(([value, count], i) => {
        const isSelected = selected.includes(value);
        const first = i === 0;
        const last = i === items.length - 1;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            aria-pressed={isSelected}
            className={cn(
              "relative flex min-h-9 flex-1 items-center justify-between gap-1.5 px-2.5 py-2 text-xs transition-[color,background-color] duration-[var(--motion-fast)] md:min-h-8 md:py-1",
              // Match the container's rounding on the end segments so a selected
              // ring hugs the corners.
              first && "rounded-l-md",
              last && "rounded-r-md",
              // Divider between segments rather than a full border per box.
              i > 0 && "border-l",
              isSelected
                ? // Ring the whole selected segment, its own divider edges
                  // included; z-10 lifts it over the neighbour's border-l.
                  "z-10 bg-muted font-semibold text-foreground ring-1 ring-primary ring-inset"
                : "text-muted-foreground hover:bg-muted/50 hover:text-primary"
            )}
          >
            <span className="truncate">{labels[value] ?? value}</span>
            <span className="font-mono opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
