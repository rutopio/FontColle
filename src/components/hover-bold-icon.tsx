import type { Icon, IconWeight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A Phosphor icon that reads as bolder while the pointer is over it, so the
// card/row action icons (favorite, download, repo) emphasize on hover. Phosphor's
// `weight` is a render-time prop, not CSS-drivable, so a hover state can't be a
// plain transition. Instead both weights stay mounted — the resting one and a
// bold twin stacked on top — and hover cross-fades between them (opacity + scale
// + blur), the same pattern used for icon swaps elsewhere. This replaced a
// useState weight swap that flipped instantly with no transition.
//
// `weight` sets the resting weight. Only "regular" gets a hover-bold twin: an
// already-emphasized resting weight (e.g. the favorite Heart's "fill" when
// active) is left alone, so a filled icon never grows a bold layer under the
// pointer. When there is no twin the single icon just renders, so callers that
// pass `className` for a one-shot animation (the heart-pop keyed remount in
// font-actions) behave exactly as before.
export function HoverBoldIcon({
  icon: IconCmp,
  weight = "regular",
  className,
}: {
  icon: Icon;
  weight?: IconWeight;
  className?: string;
}) {
  // fill/duotone/etc. already read as emphasized — no hover twin, render as-is.
  if (weight !== "regular") {
    return <IconCmp weight={weight} className={className} />;
  }

  // Stack the resting (regular) and hover (bold) icons in one grid cell and
  // cross-fade on hover. `group-hover/hover-icon` scopes the hover to this
  // wrapper so nested icons in the same row don't cross-trigger. The transition
  // names its properties (never `all`); reduced-motion collapses it to a plain
  // opacity fade via styles.css.
  return (
    <span className="group/hover-icon relative grid place-items-center">
      <IconCmp
        weight="regular"
        className={cn(
          "col-start-1 row-start-1 transition-[opacity,scale,filter] duration-[var(--motion-fast)] ease-[var(--ease-snap)] group-hover/hover-icon:scale-90 group-hover/hover-icon:opacity-0 group-hover/hover-icon:blur-[3px]",
          className
        )}
      />
      <IconCmp
        weight="bold"
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 scale-90 opacity-0 blur-[3px] transition-[opacity,scale,filter] duration-[var(--motion-fast)] ease-[var(--ease-snap)] group-hover/hover-icon:scale-100 group-hover/hover-icon:opacity-100 group-hover/hover-icon:blur-0",
          className
        )}
      />
    </span>
  );
}
