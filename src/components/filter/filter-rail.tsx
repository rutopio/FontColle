import { RAIL_BTN, RAIL_BTN_OFF, RAIL_BTN_ON } from "@/components/rail-button";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import {
  FILTER_GROUPS,
  type FilterGroup,
  type FilterGroupId,
  groupActiveCount,
} from "./groups";

export function FilterGroupButton({
  group,
  active,
  count,
  onSelect,
  horizontal,
}: {
  group: FilterGroup;
  active: boolean;
  count: number;
  onSelect: (id: FilterGroupId) => void;
  horizontal?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(group.id)}
      aria-pressed={active}
      className={cn(
        cn(RAIL_BTN, "focus-visible:ring-inset"),
        horizontal ? "w-16 shrink-0 px-1" : "",
        active ? RAIL_BTN_ON : RAIL_BTN_OFF
      )}
    >
      <group.icon
        className="size-5 group-hover/rail-btn:hidden"
        weight="regular"
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
      <span className="sr-only">
        {count > 0 ? ` filters, ${count} selected` : " filters"}
      </span>
    </button>
  );
}

export function FilterRail({
  active,
  filter,
  onSelect,
  orientation = "vertical",
}: {
  active: FilterGroupId;
  filter: FilterState;
  onSelect: (id: FilterGroupId) => void;
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
      {FILTER_GROUPS.map((group) => (
        <FilterGroupButton
          key={group.id}
          group={group}
          active={group.id === active}
          count={groupActiveCount(group, filter)}
          onSelect={onSelect}
          horizontal={orientation === "horizontal"}
        />
      ))}
    </nav>
  );
}
