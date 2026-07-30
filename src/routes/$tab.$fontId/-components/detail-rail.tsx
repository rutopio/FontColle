import {
  BookOpenIcon,
  CodeIcon,
  EyesIcon,
  PenNibIcon,
  ScrollIcon,
  SquaresFourIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { RAIL_BTN, RAIL_BTN_ON } from "@/components/rail-button";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

export type DetailTab =
  | "tester"
  | "sample"
  | "glyphs"
  | "use"
  | "detail"
  | "designer"
  | "license";

export const TABS = [
  {
    id: "sample" as const,
    slug: "instances",
    label: "Instances",
    icon: EyesIcon,
  },
  {
    id: "tester" as const,
    slug: "tester",
    label: "Tester",
    icon: PenNibIcon,
  },
  {
    id: "glyphs" as const,
    slug: "glyphs",
    label: "Glyphs",
    icon: SquaresFourIcon,
  },
  {
    id: "detail" as const,
    slug: "detail",
    label: "Detail",
    icon: BookOpenIcon,
  },
  {
    id: "designer" as const,
    slug: "designer",
    label: "Designer",
    icon: UserIcon,
  },
  { id: "use" as const, slug: "use", label: "Use", icon: CodeIcon },
  {
    id: "license" as const,
    slug: "license",
    label: "License",
    icon: ScrollIcon,
  },
];

export type TabSlug = (typeof TABS)[number]["slug"];

const BY_SLUG = new Map(TABS.map((t) => [t.slug, t.id]));
const BY_ID = new Map(TABS.map((t) => [t.id, t.slug]));

export const tabFromSlug = (slug: string): DetailTab | undefined =>
  BY_SLUG.get(slug);
export const slugFromTab = (id: DetailTab): TabSlug => BY_ID.get(id) as TabSlug;

export function DetailTabBar({
  active,
  fontId,
}: {
  active: DetailTab;
  fontId: string;
}) {
  return (
    <nav
      aria-label="Detail views"
      className="flex gap-1 overflow-x-auto border-border border-b bg-background px-2 py-1.5 md:hidden"
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            to="/$tab/$fontId"
            params={{ tab: tab.slug, fontId }}
            replace
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              on
                ? "bg-accent font-medium text-accent-foreground"
                : "hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <tab.icon className="size-4" weight="regular" />
            <span className="font-heading">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DetailRailButton({
  tab,
  on,
  onSelect,
  proximityActive,
  proximityIndex,
  registerItem,
}: {
  tab: (typeof TABS)[number];
  on: boolean;
  onSelect: (id: DetailTab) => void;
  proximityActive: boolean;
  proximityIndex: number;
  registerItem: (index: number, element: HTMLElement | null) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerItem(proximityIndex, btnRef.current);
    return () => registerItem(proximityIndex, null);
  }, [proximityIndex, registerItem]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-pressed={on}
      aria-label={`${tab.label} view`}
      data-proximity-active={proximityActive || undefined}
      className={cn(
        cn(RAIL_BTN, "focus-visible:ring-inset"),
        on ? RAIL_BTN_ON : "hover:text-foreground"
      )}
    >
      <tab.icon
        className="size-5 group-hover/rail-btn:hidden group-data-proximity-active/rail-btn:hidden"
        weight="regular"
      />
      <tab.icon
        className="hidden size-5 group-hover/rail-btn:block group-data-proximity-active/rail-btn:block"
        weight="duotone"
      />
      <span className="font-heading text-[10px] leading-none">
        {tab.label}
      </span>
    </button>
  );
}

export function DetailRail({
  active,
  onSelect,
}: {
  active: DetailTab;
  onSelect: (id: DetailTab) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const {
    activeIndex,
    sessionRef,
    handlers,
    registerItem,
    itemRects,
    isMeasured,
  } = useProximityHover(navRef);

  const hoverRect =
    isMeasured && activeIndex !== null ? itemRects[activeIndex] : null;

  return (
    <nav
      ref={navRef}
      aria-label="Detail views"
      onMouseMove={handlers.onMouseMove}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      className="relative flex flex-col gap-1"
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

      {TABS.map((tab, index) => (
        <DetailRailButton
          key={tab.id}
          tab={tab}
          on={tab.id === active}
          onSelect={onSelect}
          proximityIndex={index}
          registerItem={registerItem}
          proximityActive={activeIndex === index}
        />
      ))}
    </nav>
  );
}
