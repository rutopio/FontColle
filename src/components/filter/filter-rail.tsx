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
  orientation = "vertical",
}: {
  active: FilterGroupId;
  filter: FilterState;
  onSelect: (id: FilterGroupId) => void;
  // Vertical is the desktop icon rail; horizontal is the mobile filter drawer's
  // top strip (a scrollable row of the same group buttons).
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <nav
      aria-label="Filter groups"
      className={cn(
        "flex gap-1",
        orientation === "horizontal"
          ? "flex-row overflow-x-auto pb-1"
          : "flex-col"
      )}
    >
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
              "group/rail-btn relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              orientation === "horizontal" ? "w-16 shrink-0 px-1" : "",
              on
                ? "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
                the base icon hides on hover and the bold twin shows. */}
            <group.icon
              className="size-5 group-hover/rail-btn:hidden"
              weight={on ? "fill" : "regular"}
            />
            <group.icon
              className="hidden size-5 group-hover/rail-btn:block"
              weight="duotone"
            />
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
