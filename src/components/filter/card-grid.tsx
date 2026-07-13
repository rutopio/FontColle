import type { Icon } from "@phosphor-icons/react";
import { CardButton } from "./card-button";
import { SectionHeader } from "./section-header";
import { WeightSpecimen, WidthSpecimen } from "./specimen-icon";

// Big-button grid (same shape as CategoryCards) for value dimensions like Weight
// and Width. Each card renders an Inconsolata "Aa" at the weight/width it stands
// for, above its label + family count, drawn from a static SVG specimen (no
// webfont load). All cards render at once (no rare collapse): the value sets are
// small and fixed.
export function CardGrid({
  title,
  icon: Icon,
  items,
  selected,
  onToggle,
  onReset,
  label,
  axis,
  flashKey,
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
  // Bumped when this section's pick was cleared by the sibling axis (see
  // FilterSidebar), so the header flashes to hint at the swap.
  flashKey?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title={title}
        icon={Icon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        flashKey={flashKey}
      />
      {/* At most one value per section (enforced by the handler). */}
      <div className="grid grid-cols-3 gap-3">
        {items.map(([value, count]) => (
          <CardButton
            key={value}
            label={label(value)}
            count={count}
            selected={selected.includes(value)}
            onToggle={() => onToggle(value)}
            className="justify-center"
          >
            {axis === "wght" ? (
              <WeightSpecimen value={value} />
            ) : (
              <WidthSpecimen value={value} />
            )}
          </CardButton>
        ))}
      </div>
    </div>
  );
}
