import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { ACTIVITY_LABELS } from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

export function MaintenanceSection({
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
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Maintenance"
        icon={ClockCounterClockwiseIcon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        info="From the modified stamp in the font's own head table, so it tracks when the file was last built rather than when it was last published."
      />
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([value, count]) => (
          <PillButton
            key={value}
            value={value}
            count={count}
            label={ACTIVITY_LABELS[value] ?? value}
            selected={selected.includes(value)}
            onToggle={onToggle}
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
