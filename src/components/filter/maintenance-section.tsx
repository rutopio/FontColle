import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { ACTIVITY_LABELS } from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

// Maintenance-activity filter: Latest / Active / Recent / Dormant, two per row.
// Multi-select with OR semantics, a family matches when its activity bucket is
// one of the selected ones. Every family falls into exactly one bucket (by how
// long ago it last shipped), so the four pills partition the catalog. Order is
// fixed, from the facet index.
export function MaintenanceSection({
  items,
  selected,
  onToggle,
  onReset,
}: {
  // [bucketId, count], e.g. ["active", 512]. Fixed order.
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
