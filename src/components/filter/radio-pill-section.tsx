import type { Icon } from "@phosphor-icons/react";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

// A two-per-row grid of radio-style pills: at most one selected, clicking the
// current value clears it. Used for the mutually exclusive either/or filters
// (Monochrome vs Colorful, Static vs Variable) where a multi-select would only
// ever produce an empty result.
export function RadioPillSection({
  title,
  icon,
  items,
  labels,
  selected,
  onToggle,
  onReset,
}: {
  title: string;
  icon: Icon;
  // [value, count], in display order.
  items: [string, number][];
  // value -> human label; falls back to the raw value.
  labels: Record<string, string>;
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title={title}
        icon={icon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([value, count]) => (
          <PillButton
            key={value}
            value={value}
            count={count}
            label={labels[value] ?? value}
            selected={selected.includes(value)}
            onToggle={onToggle}
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
