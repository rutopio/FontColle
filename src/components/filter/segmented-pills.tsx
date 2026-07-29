import { cn } from "@/lib/utils";

export function SegmentedPills({
  items,
  labels,
  selected,
  onToggle,
}: {
  items: [string, number][];
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
              "relative flex min-h-9 flex-1 items-center justify-between gap-1.5 px-2.5 py-2 text-xs transition-[color,background-color] duration-[var(--motion-fast)] ease-[var(--ease-snap)] md:min-h-8 md:py-1",
              first && "rounded-l-md",
              last && "rounded-r-md",
              i > 0 && "border-l",
              isSelected
                ? "z-10 bg-muted font-semibold text-foreground ring-1 ring-primary ring-inset"
                : "text-muted-foreground hover:bg-muted/50 hover:text-primary"
            )}
          >
            <span className="truncate text-foreground">
              {labels[value] ?? value}
            </span>
            <span className="font-mono opacity-60">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
