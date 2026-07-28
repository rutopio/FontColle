import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { cn } from "@/lib/utils";

// Theme is just the `dark` class on <html>; a blocking script in __root's
// <head> applies the saved choice before paint. An unset value stays light.
export function ThemeToggle({
  variant = "rail",
}: {
  // "rail" is the icon-over-label tile, "bar" the compact mobile top-bar icon,
  // "header" the same tile sized for a page header's run of cells.
  variant?: "rail" | "bar" | "header";
}) {
  // Light on the server and first client render, or hydration mismatches.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    // The class first, before React hears about it: this is what repaints the
    // page, and it must not wait on a re-render of the whole provider tree
    // under __root, which is what made the switch feel like it lagged the
    // click. setIsDark only drives this button's own sun/moon cross-fade.
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private mode / storage disabled: still toggles for this session.
    }
  };

  // Names the theme the click switches TO.
  const target = isDark ? "Light" : "Dark";
  const bar = variant === "bar";
  const header = variant === "header";
  const chrome = bar ? RAIL_BAR_BTN : header ? RAIL_HEADER_BTN : RAIL_BTN;
  // The header's cell owns the hover tint (and the group the icon swap
  // watches), so this must not stack a second hover on top of it.
  const hover = header ? undefined : RAIL_BTN_OFF;

  return (
    <nav
      aria-label="Theme"
      // w-full in the header: the cell sizes the control, and without it this
      // wrapper shrink-wraps the label and the tile inside floats in the middle
      // of the cell rather than filling it the way a rail button does.
      className={header ? "w-full" : bar ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${target.toLowerCase()} theme`}
        className={cn(chrome, hover)}
      >
        {/* Sun and Moon both stay mounted and stacked; `isDark` cross-fades
            between them (opacity + scale + blur) so the theme switch reads as a
            transition, not a hard swap. reduced-motion collapses the transform
            to a plain opacity fade (see styles.css). The base/duotone pair keeps
            the same hover-weight swap the rail buttons use. */}
        <span className="relative grid size-5 place-items-center">
          <IconFace icon={SunIcon} shown={isDark} />
          <IconFace icon={MoonIcon} shown={!isDark} />
        </span>
        {!bar && (
          <span className="max-w-full truncate text-[10px] leading-none">
            {target}
          </span>
        )}
      </button>
    </nav>
  );
}

// The blur is worth it here, unlike HoverBoldIcon: these two layers are
// different glyphs, so defocusing hides the shape change.
function IconFace({
  icon: Icon,
  shown,
}: {
  icon: typeof SunIcon;
  shown: boolean;
}) {
  return (
    <span
      className={`col-start-1 row-start-1 transition-[opacity,scale,filter] duration-[var(--motion-base)] ease-[var(--ease-snap)] ${
        shown
          ? "scale-100 opacity-100 blur-0"
          : "pointer-events-none scale-50 opacity-0 blur-[4px]"
      }`}
      aria-hidden={!shown}
    >
      <Icon className="size-5 group-hover/rail-btn:hidden" />
      <Icon
        className="hidden size-5 group-hover/rail-btn:block"
        weight="duotone"
      />
    </span>
  );
}
