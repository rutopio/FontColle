import type { Icon, IconWeight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function HoverBoldIcon({
  icon: IconCmp,
  weight = "regular",
  className,
}: {
  icon: Icon;
  weight?: IconWeight;
  className?: string;
}) {
  if (weight !== "regular") {
    return <IconCmp weight={weight} className={className} />;
  }

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
