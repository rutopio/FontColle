import { ShapesIcon } from "@phosphor-icons/react";
import { CardButton } from "./card-button";
import { CategorySpecimen } from "./specimen-icon";

// Fixed display order for the Category cards (not by count): Graphics last,
// since it's the odd one out (symbol/emoji/icon faces). Unknown classes sort
// after these, alphabetically.
const CLASS_ORDER = ["Sans", "Serif", "Mono", "Display", "Script", "Graphics"];
const classRank = (v: string) => {
    const i = CLASS_ORDER.indexOf(v);
    return i === -1 ? CLASS_ORDER.length : i;
};

// Category filter as large square, tappable cards. Each card writes "Aa" in a
// typeface representative of that category, drawn from a static SVG specimen (no
// webfont load). Multi-select is preserved: a card is a toggle, not a radio.
export function CategoryCards({
    items,
    selected,
    onToggle,
}: {
    items: [string, number][];
    selected: string[];
    onToggle: (v: string) => void;
}) {
    const ordered = [...items].sort(
        ([a], [b]) => classRank(a) - classRank(b) || a.localeCompare(b)
    );
    return (
        <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
                <ShapesIcon className="size-4" />
                Category
            </h2>
            <div className="grid grid-cols-3 gap-3">
                {ordered.map(([value, count]) => (
                    <CardButton
                        key={value}
                        label={value}
                        count={count}
                        selected={selected.includes(value)}
                        onToggle={() => onToggle(value)}
                    >
                        <CategorySpecimen category={value} />
                    </CardButton>
                ))}
            </div>
        </div>
    );
}
