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
            "text-[10px]",
            // The outline variant is transparent, so a hovered card or row
            // tinted the badge along with itself. Fill it so it stays a chip
            // on its own canvas; `secondary` is already opaque.
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
