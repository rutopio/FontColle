import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { writeStorage } from "@/lib/storage-warning";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  variant = "rail",
}: {
  variant?: "rail" | "bar" | "header";
}) {
  const [isDark, setIsDark] = useState(false);

  useMountEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  });

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
    writeStorage("font-fridge.theme", next ? "dark" : "light");
  };

  const target = isDark ? "Light" : "Dark";
  const bar = variant === "bar";
  const header = variant === "header";
  const chrome = bar ? RAIL_BAR_BTN : header ? RAIL_HEADER_BTN : RAIL_BTN;
  const hover = header ? undefined : RAIL_BTN_OFF;

  return (
    <nav
      aria-label="Theme"
      className={header || bar ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${target.toLowerCase()} theme`}
        className={cn(chrome, hover)}
      >
        <span className="relative grid size-5 place-items-center">
          <IconFace icon={SunIcon} shown={isDark} />
          <IconFace icon={MoonIcon} shown={!isDark} />
        </span>
        {!(bar || header) && (
          <span className="max-w-full truncate text-3xs leading-none">
            {target}
          </span>
        )}
      </button>
    </nav>
  );
}

function IconFace({
  icon: Icon,
  shown,
}: {
  icon: typeof SunIcon;
  shown: boolean;
}) {
  return (
    <span
      className={`col-start-1 row-start-1 transition-[opacity,scale,filter] duration-base ease-snap ${
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
