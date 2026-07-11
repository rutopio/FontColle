import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

// Light/dark toggle for the icon rail's footer, styled to match the rail's
// filter buttons (icon over a small label). Theme is just the `dark` class on
// <html>; a blocking script in __root's <head> applies the saved choice before
// paint (no flash), and this button flips it and persists to localStorage.
// Default is light: an unset/other value stays light.
export function ThemeToggle() {
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
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <nav aria-label="Theme" className="flex flex-col gap-1 px-1.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${target.toLowerCase()} theme`}
        className="relative flex cursor-pointer flex-col items-center gap-1 rounded-md py-2 text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <Icon className="size-5" />
        <span className="text-[10px] leading-none">{target}</span>
      </button>
    </nav>
  );
}
