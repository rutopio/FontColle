import { ShapesIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import {
  ensureFontLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { cn } from "@/lib/utils";
import { CATEGORY_SPECIMEN } from "./constants";

// Category filter as large square, tappable cards. Each card writes "Aa" in a
// typeface representative of that category. Multi-select is preserved: a card is
// a toggle, not a radio.
export function CategoryCards({
  items,
  selected,
  onToggle,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
        <ShapesIcon className="size-4" />
        Category
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map(([value, count]) => (
          <CategoryCard
            key={value}
            value={value}
            count={count}
            on={selected.includes(value)}
            onToggle={() => onToggle(value)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  value,
  count,
  on,
  onToggle,
}: {
  value: string;
  count: number;
  on: boolean;
  onToggle: () => void;
}) {
  const specimen = CATEGORY_SPECIMEN[value];
  const loaded = useFontLoaded(specimen ?? "");

  useEffect(() => {
    if (specimen) ensureFontLoaded(specimen, [400]);
  }, [specimen]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "relative flex cursor-pointer flex-col items-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow,border-color,background-color]",
        on
          ? "border-primary bg-muted"
          : "border-input hover:border-foreground/40"
      )}
    >
      <span
        className="text-2xl leading-none"
        style={
          specimen
            ? { fontFamily: previewFontFamily(specimen, loaded) }
            : undefined
        }
      >
        Aa
      </span>
      <span className="font-medium text-muted-foreground text-xs leading-none">
        {value}
      </span>
      <span className="font-mono text-muted-foreground text-xs leading-none">
        {count}
      </span>
    </button>
  );
}
