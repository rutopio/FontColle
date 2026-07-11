import { ShapesIcon } from "@phosphor-icons/react";
import { CardButton } from "./card-button";
import { CategorySpecimen } from "./specimen-icon";

// One Category card. Most are primary classes, but a few are cross-cutting
// traits surfaced as cards too (Italic -> has-italic facet, Slab -> /Slab/*
// classification). `value` doubles as the specimen key (category-<value>.svg).
export interface CategoryCard {
  value: string;
  count: number;
  selected: boolean;
}

// Category filter as large square, tappable cards. Each card writes "Aa" in a
// typeface representative of that category (a static SVG specimen, no webfont
// load); Emoji uses an icon. Cards are toggles, not radios; the caller decides
// which filter key each card's value maps to.
export function CategoryCards({
  cards,
  onToggle,
}: {
  cards: CategoryCard[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
        <ShapesIcon className="size-4" />
        Category
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <CardButton
            key={card.value}
            label={card.value}
            count={card.count}
            selected={card.selected}
            onToggle={() => onToggle(card.value)}
          >
            <CategorySpecimen category={card.value} />
          </CardButton>
        ))}
      </div>
    </div>
  );
}
