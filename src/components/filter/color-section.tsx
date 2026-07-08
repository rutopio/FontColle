import { PaletteIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// Color filter: Monochrome vs Colorful (multicolor COLR/OTSVG fonts), from the
// static color-font set. Radio-style — at most one selected — in the same
// header/reset idiom as the Weight/Width card grids.
export function ColorSection({
  items,
  selected,
  onToggle,
  onReset,
}: {
  // [value, count] where value is "monochrome" | "color".
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  const label: Record<string, string> = {
    monochrome: "Monochrome",
    color: "Colorful",
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
          <PaletteIcon className="size-4" />
          Color
        </h2>
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset Color"
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
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={on}
              className={cn(
                "flex min-w-0 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                on
                  ? "border-primary bg-muted text-foreground"
                  : "text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{label[value] ?? value}</span>
              <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
