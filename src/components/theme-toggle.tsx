import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { RAIL_BAR_BTN, RAIL_BTN, RAIL_BTN_OFF } from "@/components/rail-button";
import { cn } from "@/lib/utils";

// Light/dark toggle for the icon rail's footer, styled to match the rail's
// filter buttons (icon over a small label). Theme is just the `dark` class on
// <html>; a blocking script in __root's <head> applies the saved choice before
// paint (no flash), and this button flips it and persists to localStorage.
// Default is light: an unset/other value stays light.
export function ThemeToggle({
  variant = "rail",
}: {
  // "rail" is the desktop icon-over-label tile; "bar" is the compact mobile
  // top-bar icon button (no label).
  variant?: "rail" | "bar";
}) {
  // Start light on both server and first client render to match the SSR shell
  // and avoid a hydration mismatch; sync to the real class after mount.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private mode / storage disabled: still toggles for this session.
    }
  };

  // Label names the theme the click switches TO, mirroring the rail's naming.
  const target = isDark ? "Light" : "Dark";
  const bar = variant === "bar";

  return (
    <nav aria-label="Theme" className={bar ? undefined : "flex flex-col gap-1"}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${target.toLowerCase()} theme`}
        className={
          bar ? cn(RAIL_BAR_BTN, RAIL_BTN_OFF) : cn(RAIL_BTN, RAIL_BTN_OFF)
        }
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
        {!bar && <span className="text-[10px] leading-none">{target}</span>}
      </button>
    </nav>
  );
}

// One theme icon stacked in the shared grid cell. `shown` drives an opacity +
// scale + blur cross-fade on the theme switch; the base weight hides on hover
// and the duotone twin shows, matching the filter rail's hover treatment.
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
