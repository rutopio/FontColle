import { RAIL_BTN } from "@/components/rail-button";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import {
  FILTER_GROUPS,
  type FilterGroup,
  type FilterGroupId,
  groupActiveCount,
} from "./groups";

// Exported so the sidebar footer can render the Preset group, which lives
// outside FILTER_GROUPS, with identical chrome rather than a copy that drifts.
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
      // No aria-label: an override has to repeat the visible text verbatim or it
      // trips WCAG 2.5.3 (Label in Name), and the badge renders the count as
      // visible text right after the label ("Language" + "1"), which no
      // hand-written string matches cleanly. Letting the name come from the
      // content keeps the two in lockstep; the sr-only span below supplies the
      // wording the badge alone can't convey.
      className={cn(
        cn(RAIL_BTN, "focus-visible:ring-inset"),
        horizontal ? "w-16 shrink-0 px-1" : "",
        active
          ? "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12"
          : "hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
    >
      {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
          the base icon hides on hover and the bold twin shows. */}
      <group.icon
        className="size-5 group-hover/rail-btn:hidden"
        weight="regular"
      />
      <group.icon
        className="hidden size-5 group-hover/rail-btn:block"
        weight="duotone"
      />
      <span className="text-[10px] leading-none">{group.label}</span>
      {/* Before the sr-only text, not after: the badge is absolutely positioned
          so DOM order costs nothing visually, but it keeps the digit from
          landing after "selected" when a screen reader reads the name. */}
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

// Badged with each group's selected count, so a selection stays visible while
// its group is scrolled away. Preset renders in the sidebar footer instead.
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
