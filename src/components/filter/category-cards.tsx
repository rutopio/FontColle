import { ShapesIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { CardButton } from "./card-button";
import { HeaderButton, InfoTip } from "./section-header";
import { CategorySpecimen } from "./specimen-icon";

// Same cross-fade the SectionHeader Reset uses, so Category's Reset animates on
// the exact same clock as every other section's.
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: "easeOut" },
} as const;

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
  onReset,
}: {
  cards: CategoryCard[];
  onToggle: (value: string) => void;
  onReset: () => void;
}) {
  const hasSelection = cards.some((c) => c.selected);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
          <ShapesIcon className="size-4" />
          Category
          <InfoTip title="Category">
            {
              "One primary class per family, so the cards partition the catalog. Derived from Google Fonts’ letterform classifications by taking each family’s highest-scoring one, with Mono winning ties over Sans or Serif. Families Google has not classified fall back to the category its API reports."
            }
          </InfoTip>
        </h2>
        {/* Reserve the slot's height up front with an invisible Reset, then
            cross-fade the live one in on first selection so nothing shifts. */}
        <div className="relative shrink-0">
          <HeaderButton
            onClick={() => {}}
            label=""
            aria-hidden
            className="invisible"
          >
            <XIcon className="size-3" />
            Reset
          </HeaderButton>
          <AnimatePresence initial={false}>
            {hasSelection ? (
              <motion.div
                key="reset"
                {...FADE}
                className="absolute inset-y-0 right-0"
              >
                <HeaderButton onClick={onReset} label="Reset Category">
                  <XIcon className="size-3" />
                  Reset
                </HeaderButton>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
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
