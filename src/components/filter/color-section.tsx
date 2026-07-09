import { PaletteIcon, StackIcon } from "@phosphor-icons/react";
import { colorFormatLabel } from "@/lib/fonts/color";
import { cn } from "@/lib/utils";
import { RadioPillSection } from "./radio-pill-section";
import { SectionHeader } from "./section-header";

const COLOR_LABELS = { monochrome: "Monochrome", color: "Colorful" };

// Color filter: Monochrome vs Colorful (fonts carrying a color table).
// Radio-style — at most one selected.
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
  return (
    <RadioPillSection
      title="Color"
      icon={PaletteIcon}
      items={items}
      labels={COLOR_LABELS}
      selected={selected}
      onToggle={onToggle}
      onReset={onReset}
    />
  );
}

// Color-table format filter: COLR/CPAL, OpenType-SVG, sbix, CBDT/CBLC, two per
// row. Multi-select with AND semantics — a font can carry several color tables
// at once, so selecting two formats narrows to the fonts providing both, and
// the per-format counts overlap (they sum above the colorful total).
//
// All four formats always render, even the ones no published font uses. They
// stay clickable and simply yield an empty result, rather than hiding a filter
// that would silently reappear the day Google ships such a font.
//
// `disabled` fades the whole grid: Monochrome means "carries no color table", so
// a format filter under it could never match anything. Clicking Monochrome also
// clears the format selection (see FilterSidebar.selectColor). A hand-typed
// ?color=monochrome&cfmt=COLR can still arrive pre-selected — the empty result
// is then correct, and the header's Reset stays available to escape it.
export function ColorFormatSection({
  items,
  selected,
  onToggle,
  onReset,
  disabled = false,
}: {
  // [formatId, count], e.g. ["COLR", 21]. Fixed order, zero counts included.
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Color format"
        icon={StackIcon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div
        className={cn(
          "grid grid-cols-2 gap-1.5 transition-opacity",
          disabled && "opacity-40"
        )}
      >
        {items.map(([value, count]) => {
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={on}
              disabled={disabled}
              className={cn(
                "flex min-w-0 items-center justify-between gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                disabled && "cursor-not-allowed",
                on
                  ? "border-primary bg-muted text-foreground"
                  : "text-muted-foreground",
                !disabled &&
                  !on &&
                  "hover:border-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{colorFormatLabel(value)}</span>
              <span className="font-mono opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
