import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import {
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_BTN_ON_SLIDING,
  RAIL_INDICATOR,
} from "@/components/rail-button";
import {
  useProximityHover,
  useRegisterProximityItem,
} from "@/hooks/use-proximity-hover";
import type { FilterState } from "@/lib/fonts/filter";
import { EASE_OUT, MOTION_S, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  FILTER_GROUPS,
  type FilterGroup,
  type FilterGroupId,
  groupActiveCount,
} from "./groups";

const RailIndicator = ({ layoutId }: { layoutId: string }) => (
  <motion.span
    aria-hidden="true"
    className={RAIL_INDICATOR}
    layoutId={layoutId}
    transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
  />
);

export function FilterGroupButton({
  group,
  active,
  count,
  onSelect,
  horizontal,
  indicatorId,
  proximityActive,
  proximityIndex,
  registerItem,
}: {
  group: FilterGroup;
  active: boolean;
  count: number;
  onSelect: (id: FilterGroupId) => void;
  horizontal?: boolean;
  indicatorId: string;
  proximityActive?: boolean;
  proximityIndex?: number;
  registerItem?: (index: number, element: HTMLElement | null) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hasProximity = registerItem != null && proximityIndex != null;

  useRegisterProximityItem(registerItem, proximityIndex, btnRef);

  return (
    <button
      ref={hasProximity ? btnRef : undefined}
      type="button"
      onClick={() => onSelect(group.id)}
      aria-pressed={active}
      data-proximity-active={proximityActive || undefined}
      className={cn(
        RAIL_BTN,
        "isolate focus-visible:ring-inset",
        horizontal ? "w-16 shrink-0 px-1" : "",
        active
          ? RAIL_BTN_ON_SLIDING
          : hasProximity
            ? "hover:text-foreground"
            : RAIL_BTN_OFF
      )}
    >
      {active && <RailIndicator layoutId={indicatorId} />}
      <group.icon
        className="size-5 group-hover/rail-btn:hidden group-data-proximity-active/rail-btn:hidden"
        weight="regular"
      />
      <group.icon
        className="hidden size-5 group-hover/rail-btn:block group-data-proximity-active/rail-btn:block"
        weight="duotone"
      />
      <span className="text-3xs leading-none">{group.label}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-3xs text-primary-foreground leading-none"
        >
          {count}
        </span>
      )}
      <span className="sr-only">
        {count > 0
          ? `${group.label} filters, ${count} selected`
          : `${group.label} filters`}
      </span>
    </button>
  );
}

export function FilterRail({
  active,
  filter,
  onSelect,
  orientation = "vertical",
  indicatorId,
}: {
  active: FilterGroupId;
  filter: FilterState;
  onSelect: (id: FilterGroupId) => void;
  orientation?: "vertical" | "horizontal";
  indicatorId: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const {
    activeIndex,
    sessionRef,
    handlers,
    registerItem,
    itemRects,
    isMeasured,
  } = useProximityHover(navRef, {
    axis: orientation === "horizontal" ? "x" : "y",
  });

  const hoverRect =
    isMeasured && activeIndex !== null ? itemRects[activeIndex] : null;

  return (
    <nav
      ref={navRef}
      aria-label="Filter groups"
      onMouseMove={handlers.onMouseMove}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      className={cn(
        "relative flex gap-1",
        orientation === "horizontal"
          ? "flex-row overflow-x-auto pb-1"
          : "flex-col"
      )}
    >
      <AnimatePresence>
        {hoverRect && (
          <motion.div
            key={sessionRef.current}
            className="pointer-events-none absolute rounded-md bg-accent/50"
            initial={{
              opacity: 0,
              top: hoverRect.top,
              left: hoverRect.left,
              width: hoverRect.width,
              height: hoverRect.height,
            }}
            animate={{
              opacity: 1,
              top: hoverRect.top,
              left: hoverRect.left,
              width: hoverRect.width,
              height: hoverRect.height,
            }}
            exit={{ opacity: 0, transition: spring.fast.exit }}
            transition={{
              ...spring.fast,
              opacity: { duration: 0.08 },
            }}
          />
        )}
      </AnimatePresence>

      {FILTER_GROUPS.map((group, index) => (
        <FilterGroupButton
          key={group.id}
          group={group}
          active={group.id === active}
          count={groupActiveCount(group, filter)}
          onSelect={onSelect}
          horizontal={orientation === "horizontal"}
          indicatorId={indicatorId}
          proximityIndex={index}
          registerItem={registerItem}
          proximityActive={activeIndex === index}
        />
      ))}
    </nav>
  );
}
