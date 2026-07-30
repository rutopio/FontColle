import { InfoIcon } from "@phosphor-icons/react";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { useAbout } from "@/lib/about/context";
import { cn } from "@/lib/utils";

export function AboutLink({
  variant = "rail",
}: {
  variant?: "rail" | "bar" | "header";
}) {
  const { open, setOpen } = useAbout();
  const bar = variant === "bar";
  const header = variant === "header";
  const chrome = bar ? RAIL_BAR_BTN : header ? RAIL_HEADER_BTN : RAIL_BTN;
  const hover = header ? undefined : RAIL_BTN_OFF;
  const expanded = bar
    ? "aria-expanded:text-foreground"
    : "aria-expanded:bg-accent aria-expanded:text-accent-foreground";

  return (
    <nav
      aria-label="About"
      className={header || bar ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="About FontColle"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(chrome, hover, expanded)}
      >
        <InfoIcon className="size-5 group-hover/rail-btn:hidden" />
        <InfoIcon
          className="hidden size-5 group-hover/rail-btn:block"
          weight="duotone"
        />
        {!(bar || header) && (
          <span className="max-w-full truncate text-[10px] leading-none">
            About
          </span>
        )}
      </button>
    </nav>
  );
}
