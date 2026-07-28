import { InfoIcon } from "@phosphor-icons/react";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { useAbout } from "@/lib/about/context";
import { cn } from "@/lib/utils";

// Opens the About dialog (components/about-dialog), styled to match whatever
// run of controls it sits in: icon over a small label in a rail or a page
// header, bare icon in the mobile top bar. It toggles context state rather than
// navigating, so the page underneath and its rail are untouched.
export function AboutLink({
  variant = "rail",
}: {
  // "rail" is the desktop icon-over-label tile; "bar" is the compact mobile
  // top-bar icon button (no label); "header" is the same tile sized for a page
  // header's run of cells.
  variant?: "rail" | "bar" | "header";
}) {
  const { open, setOpen } = useAbout();
  const bar = variant === "bar";
  const header = variant === "header";
  const chrome = bar ? RAIL_BAR_BTN : header ? RAIL_HEADER_BTN : RAIL_BTN;
  // The header's cell owns the hover tint (and the group the icon swap
  // watches), so this must not stack a second hover on top of it.
  const hover = header ? undefined : RAIL_BTN_OFF;
  // The rail and the header both light the whole tile when the dialog is up,
  // the same surface a selected rail button gets (RAIL_BTN_ON). Only the
  // mobile bar, whose button is a bare icon with no tile, just shifts colour.
  const expanded = bar
    ? "aria-expanded:text-foreground"
    : "aria-expanded:bg-black/10 aria-expanded:text-foreground dark:aria-expanded:bg-white/12";

  return (
    <nav
      aria-label="About"
      // w-full in the header: see ThemeToggle — the cell sizes the control, and
      // without it this wrapper shrink-wraps the label.
      className={header ? "w-full" : bar ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="About FontColle"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(chrome, hover, expanded)}
      >
        {/* Phosphor weight is a prop, not CSS, so hover-swaps the icon:
            the base icon hides on hover and the duotone twin shows. */}
        <InfoIcon className="size-5 group-hover/rail-btn:hidden" />
        <InfoIcon
          className="hidden size-5 group-hover/rail-btn:block"
          weight="duotone"
        />
        {!bar && (
          <span className="max-w-full truncate text-[10px] leading-none">
            About
          </span>
        )}
      </button>
    </nav>
  );
}
