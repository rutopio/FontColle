import { Badge } from "@/components/ui/badge";
import type { FilterSelection } from "@/lib/fonts/filter";
import { fontTraits } from "@/lib/fonts/traits";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

export function FontTraits({
  font,
  selection,
  badgeClassName,
}: {
  font: FontRecord;
  selection: FilterSelection;
  badgeClassName?: string;
}) {
  return (
    <>
      {fontTraits(font, selection).map((trait) => (
        <Badge
          key={trait.label}
          variant={trait.active ? "secondary" : "outline"}
          className={cn(
            "rounded-lg text-[10px]",
            // Opaque bg so the badge doesn't inherit the card's hover tint.
            !trait.active && "bg-background",
            badgeClassName
          )}
        >
          {trait.label}
        </Badge>
      ))}
    </>
  );
}
