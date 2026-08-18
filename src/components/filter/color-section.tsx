import { CircleHalfIcon, StackIcon } from "@phosphor-icons/react";
import { colorFormatLabel } from "@/lib/fonts/color";
import type { MatchMode } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";
import { PillButton } from "./pill-button";
import { RadioPillSection } from "./radio-pill-section";
import { SectionHeader } from "./section-header";

const COLOR_LABELS = { monochrome: "Monochrome", color: "Colorful" };

export function ColorSection({
  items,
  selected,
  onToggle,
  onReset,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <RadioPillSection
      title="Color"
      icon={CircleHalfIcon}
      items={items}
      labels={COLOR_LABELS}
      selected={selected}
      onToggle={onToggle}
      onReset={onReset}
    />
  );
}

export function ColorFormatSection({
  items,
  selected,
  onToggle,
  onReset,
  disabled = false,
  mode,
  onToggleMode,
}: {
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  disabled?: boolean;
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Format"
        icon={StackIcon}
        info="A font can carry several color tables at once, so these counts overlap and add up to more than the number of colorful families. Selecting two formats narrows to the fonts providing both, not either. COLR/CPAL and CBDT/CBLC are table pairs shown as one pill. Formats that no published font uses stay listed at zero instead of disappearing."
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <div
        className={cn(
          "grid grid-cols-2 gap-1.5 transition-opacity",
          disabled && "opacity-40"
        )}
      >
        {items.map(([value, count]) => (
          <PillButton
            key={value}
            value={value}
            count={count}
            label={colorFormatLabel(value)}
            selected={selected.includes(value)}
            onToggle={onToggle}
            disabled={disabled}
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
