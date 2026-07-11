import {
  EyeIcon,
  InfoIcon,
  ScrollIcon,
  SquaresFourIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type DetailTab = "sample" | "glyphs" | "detail" | "designer" | "license";

// The icon-rail switcher for the detail page, matching the list's FilterRail:
// one button per view (the type-tester sample vs. the font's specs vs. the
// designer vs. the license). Icons are chosen to not collide with the list's
// FilterRail set.
const TABS = [
  { id: "sample" as const, label: "Sample", icon: EyeIcon },
  { id: "glyphs" as const, label: "Glyphs", icon: SquaresFourIcon },
  { id: "detail" as const, label: "Detail", icon: InfoIcon },
  { id: "designer" as const, label: "Designer", icon: UserIcon },
  { id: "license" as const, label: "License", icon: ScrollIcon },
];

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
              "relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              on
                ? "bg-black/10 text-sidebar-accent-foreground dark:bg-white/12"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            <tab.icon className="size-5" weight={on ? "fill" : "regular"} />
            <span className="text-[10px] leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
