import { type Icon, XIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { WIDTH_STEP_PCT } from "@/lib/fonts/filter";
import {
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { cn } from "@/lib/utils";
import { clamp, SPECIMEN_AXES, SPECIMEN_FAMILY } from "./constants";

// Big-button grid (same shape as CategoryCards) for value dimensions like Weight
// and Width. Each card renders an Inconsolata "Aa" at the weight/width it stands
// for, above its label + family count. All cards render at once (no rare
// collapse): the value sets are small and fixed.
export function CardGrid({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  onReset,
  label,
  axis,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  // Clear this section's selection (single-select, so this section only).
  onReset: () => void;
  // Map a raw value to a display label (e.g. "700" -> "Bold").
  label: (value: string) => string;
  // Which axis the card value drives on the "Aa" specimen.
  axis: "wght" | "wdth";
}) {
  const specimenLoaded = useFontLoaded(SPECIMEN_FAMILY);
  useEffect(() => {
    ensureFontRangeLoaded(SPECIMEN_FAMILY, SPECIMEN_AXES);
  }, []);

  // Style the "Aa" for a card: Weight cards vary font-weight; Width cards vary
  // the wdth axis (value 1..9 -> percentage), clamped to Inconsolata's range.
  const specimenStyle = (value: string): React.CSSProperties => {
    const fontFamily = previewFontFamily(SPECIMEN_FAMILY, specimenLoaded);
    if (axis === "wght") {
      return { fontFamily, fontWeight: clamp(Number(value), 200, 900) };
    }
    const pct = WIDTH_STEP_PCT[Number(value)] ?? 100;
    return {
      fontFamily,
      fontVariationSettings: `"wdth" ${clamp(pct, 50, 200)}`,
    };
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <Icon className="size-4" />
          {title}
        </h2>
        {/* Always rendered (hidden while empty) so the title row keeps a
            constant height whether or not a selection exists. Same slot/style
            as the sort toggle on other sections. */}
        <button
          type="button"
          onClick={onReset}
          aria-label={`Reset ${title}`}
          disabled={selected.length === 0}
          aria-hidden={selected.length === 0}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
            selected.length === 0 && "invisible"
          )}
        >
          <XIcon className="size-3" />
          Reset
        </button>
      </div>
      {/* At most one value per section (enforced by the handler). */}
      <div className="grid grid-cols-3 gap-3">
        {items.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={on}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow,border-color]",
                on
                  ? "border-primary"
                  : "border-input hover:border-foreground/40"
              )}
            >
              <span
                className="text-2xl leading-none"
                style={specimenStyle(value)}
              >
                Aa
              </span>
              <span className="w-full truncate font-medium text-muted-foreground text-xs leading-none">
                {label(value)}
              </span>
              <span className="font-mono text-muted-foreground text-xs leading-none">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
