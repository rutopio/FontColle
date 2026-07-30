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
import { RAIL_BTN, RAIL_BTN_OFF, RAIL_BTN_ON } from "@/components/rail-button";
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

export function DetailRail({
  active,
  onSelect,
}: {
  active: DetailTab;
  onSelect: (id: DetailTab) => void;
}) {
  return (
    <nav aria-label="Detail views" className="flex flex-col gap-1">
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-pressed={on}
            aria-label={`${tab.label} view`}
            className={cn(
              cn(RAIL_BTN, "focus-visible:ring-inset"),
              on ? RAIL_BTN_ON : RAIL_BTN_OFF
            )}
          >
            <tab.icon
              className="size-5 group-hover/rail-btn:hidden"
              weight="regular"
            />
            <tab.icon
              className="hidden size-5 group-hover/rail-btn:block"
              weight="duotone"
            />
            <span className="font-heading text-[10px] leading-none">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
