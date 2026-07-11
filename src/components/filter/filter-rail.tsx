import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { FILTER_GROUPS, type FilterGroupId, groupActiveCount } from "./groups";

// The icon-rail switcher for the filter panel: one button per filter group,
// badged with how many of that group's values are currently selected so a
// selection stays visible while its group is hidden.
export function FilterRail({
  active,
  filter,
  onSelect,
}: {
  active: FilterGroupId;
  filter: FilterState;
  onSelect: (id: FilterGroupId) => void;
}) {
  return (
    <nav aria-label="Filter groups" className="flex flex-col gap-1 px-1.5">
      {FILTER_GROUPS.map((group) => {
        const on = group.id === active;
        const count = groupActiveCount(group, filter);
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            aria-pressed={on}
            aria-label={
              count > 0
                ? `${group.label} filters, ${count} selected`
                : `${group.label} filters`
            }
            className={cn(
              "relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              on
                ? "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            <group.icon className="size-5" weight={on ? "fill" : "regular"} />
            <span className="text-[10px] leading-none">{group.label}</span>
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] text-primary-foreground leading-none"
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
