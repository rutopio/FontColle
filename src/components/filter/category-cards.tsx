import { ShapesIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { CardButton } from "./card-button";
import { HeaderButton, InfoTip } from "./section-header";
import { CategorySpecimen } from "./specimen-icon";

const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MOTION_S.fast, ease: EASE_OUT },
} as const;

export interface CategoryCard {
  value: string;
  count: number;
  selected: boolean;
}

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
