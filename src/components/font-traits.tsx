import { Badge } from "@/components/ui/badge";
import type { FilterSelection } from "@/lib/fonts/filter";
import { fontTraits } from "@/lib/fonts/traits";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

// The footer trait badges shared by the list card and row: category,
// Variable/Static, Monochrome/Colorful, and feature count. A badge turns
// secondary when its value matches the active filter (e.g. sidebar "Sans"
// highlights the category badge on every Sans font).
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
          className={cn("text-[10px]", badgeClassName)}
        >
          {trait.label}
        </Badge>
      ))}
    </>
  );
}
