import type { Icon, IconWeight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// A Phosphor icon that reads as bolder under the pointer. `weight` is a
// render-time prop, not CSS-drivable, so this can't be a plain transition:
// both weights stay mounted, stacked, and hover cross-fades their opacity.
//
// Only a "regular" resting weight gets the bold twin, so an already-emphasized
// icon (the favorite Heart's "fill") never grows a bold layer under the
// pointer. With no twin the single icon just renders, leaving callers that pass
// `className` for a one-shot animation unaffected.
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

  // `group-hover/hover-icon` scopes the hover to this wrapper, so nested icons
  // in the same row don't cross-trigger. Opacity only, which styles.css keeps
  // in its reduced-motion allow-list: the two layers are the same icon at two
  // weights, perfectly superimposed, so a blur or scale would only make a
  // hovered icon look out of focus or twitch.
  return (
    <span className="group/hover-icon relative grid place-items-center">
      <IconCmp
        weight="regular"
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-[var(--motion-fast)] ease-[var(--ease-snap)] group-hover/hover-icon:opacity-0",
          className
        )}
      />
      <IconCmp
        weight="bold"
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 opacity-0 transition-opacity duration-[var(--motion-fast)] ease-[var(--ease-snap)] group-hover/hover-icon:opacity-100",
          className
        )}
      />
    </span>
  );
}
