import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// A two-per-row grid of radio-style pills: at most one selected, clicking the
// current value clears it. Used for the mutually exclusive either/or filters
// (Monochrome vs Colorful, Static vs Variable) where a multi-select would only
// ever produce an empty result.
export function RadioPillSection({
  title,
  icon,
  items,
  labels,
  selected,
  onToggle,
  onReset,
}: {
  title: string;
  icon: Icon;
  // [value, count], in display order.
  items: [string, number][];
  // value -> human label; falls back to the raw value.
  labels: Record<string, string>;
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title={title}
        icon={icon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={on}
              className={cn(
                "flex min-w-0 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-primary bg-muted text-foreground"
                  : "text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{labels[value] ?? value}</span>
              <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
