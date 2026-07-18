import {
  BookOpenIcon,
  CodeIcon,
  EyeIcon,
  InfoIcon,
  ScrollIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type DetailTab =
  | "sample"
  | "glyphs"
  | "use"
  | "detail"
  | "designer"
  | "license";

// The icon-rail switcher for the detail page, matching the list's FilterRail:
// one button per view (the type-tester sample vs. the font's specs vs. the
// designer vs. the license). Icons are chosen to not collide with the list's
// FilterRail set.
//
// `slug` is the URL segment (/{slug}/{fontId}); it differs from the internal
// tab id where the user-facing name diverged (specimen/about) from the
// original code names (sample/designer).
export const TABS = [
  { id: "sample" as const, slug: "specimen", label: "Specimen", icon: EyeIcon },
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
  { id: "designer" as const, slug: "about", label: "About", icon: InfoIcon },
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

// Resolve a URL segment to a tab id, or undefined for an unknown slug.
export const tabFromSlug = (slug: string): DetailTab | undefined =>
  BY_SLUG.get(slug);
export const slugFromTab = (id: DetailTab): TabSlug => BY_ID.get(id) as TabSlug;

// Mobile-only (<768px) horizontal tab strip, pinned under the detail header.
// Mirrors the desktop DetailRail but scrolls sideways and navigates via Link
// (replace, matching selectTab) instead of a callback, so it needs no extra
// wiring from the page. `fontId` is the current URL slug.
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
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              on
                ? "bg-black/10 font-medium text-foreground dark:bg-white/12"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            <tab.icon className="size-4" weight={on ? "fill" : "regular"} />
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
              "group/rail-btn relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              on
                ? "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
                the base icon hides on hover and the bold twin shows. */}
            <tab.icon
              className="size-5 group-hover/rail-btn:hidden"
              weight={on ? "fill" : "regular"}
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
