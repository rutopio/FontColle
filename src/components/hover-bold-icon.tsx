import type { Icon, IconWeight } from "@phosphor-icons/react";
import { useState } from "react";

// A Phosphor icon that renders in `bold` weight while the pointer is over it,
// so the card/row action icons (favorite, download, repo) read as bolder on
// hover. Phosphor's `weight` is a render-time prop (not CSS-drivable), so we
// track hover in state and swap it. `weight` sets the resting weight; an
// already-emphasized resting weight (e.g. the favorite Heart's "fill" when
// active) is left alone on hover, so a filled icon never downgrades to an
// outline under the pointer.
export function HoverBoldIcon({
  icon: IconCmp,
  weight = "regular",
  className,
}: {
  icon: Icon;
  weight?: IconWeight;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  // Only lift "regular" to "bold"; fill/duotone/etc. already read as emphasized.
  const effective: IconWeight =
    hovered && weight === "regular" ? "bold" : weight;
  return (
    <IconCmp
      weight={effective}
      className={className}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    />
  );
}
