import { EyeIcon, InfoIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// The icon-rail switcher for the detail page, matching the list's FilterRail:
// one button per view (the type-tester sample vs. the font's specs/detail).
// Icons are chosen to not collide with the list's FilterRail set.
const TABS = [
  { id: "sample" as const, label: "Sample", icon: EyeIcon },
  { id: "detail" as const, label: "Detail", icon: InfoIcon },
];

export function DetailRail({
  active,
  onSelect,
}: {
  active: "sample" | "detail";
  onSelect: (id: "sample" | "detail") => void;
}) {
  return (
    <nav aria-label="Detail views" className="flex flex-col gap-1 px-1.5">
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
