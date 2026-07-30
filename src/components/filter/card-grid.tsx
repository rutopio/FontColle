import type { Icon } from "@phosphor-icons/react";
import type { MatchMode } from "@/lib/fonts/filter";
import { CardButton } from "./card-button";
import { SectionHeader } from "./section-header";
import { WeightSpecimen, WidthSpecimen } from "./specimen-icon";

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
  mode,
  onToggleMode,
}: {
  title: string;
  icon: Icon;
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  label: (value: string) => string;
  axis: "wght" | "wdth";
  flashKey?: number;
  mode?: MatchMode;
  onToggleMode?: () => void;
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
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <div className="grid grid-cols-3 gap-1.5">
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
