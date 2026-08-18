import { FadersHorizontalIcon } from "@phosphor-icons/react";
import { RAIL_BTN, RAIL_BTN_OFF, RAIL_BTN_ON } from "@/components/rail-button";
import { cn } from "@/lib/utils";

export function PreviewToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <nav aria-label="Preview controls" className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => onToggle(!active)}
        aria-pressed={active}
        className={cn(
          RAIL_BTN,
          "isolate focus-visible:ring-inset",
          active ? RAIL_BTN_ON : RAIL_BTN_OFF
        )}
      >
        <FadersHorizontalIcon
          className="size-5 group-hover/rail-btn:hidden"
          weight="regular"
        />
        <FadersHorizontalIcon
          className="hidden size-5 group-hover/rail-btn:block"
          weight="duotone"
        />
        <span className="text-3xs leading-none">Preview</span>
        <span className="sr-only">
          {active ? "Hide preview controls" : "Show preview controls"}
        </span>
      </button>
    </nav>
  );
}
