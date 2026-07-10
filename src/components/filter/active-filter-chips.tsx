import { XIcon } from "@phosphor-icons/react";
import type { FilterState } from "@/lib/fonts/filter";
import { describeActiveFilters } from "./describe";

// The active filter conditions, each a removable chip. Rendered in the empty
// state so a user who filtered themselves into zero results can see exactly
// which conditions are stacked, and lift them one at a time.
export function ActiveFilterChips({
  filter,
  onChange,
}: {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const chips = describeActiveFilters(filter);
  if (chips.length === 0) return null;
  return (
    <div className="flex max-w-2xl flex-wrap justify-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onChange(chip.remove)}
          className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground"
          aria-label={`Remove filter ${chip.section}: ${chip.value}`}
        >
          <span className="opacity-60">{chip.section}</span>
          <span className="text-foreground">{chip.value}</span>
          <XIcon className="size-3 opacity-60" />
        </button>
      ))}
    </div>
  );
}
