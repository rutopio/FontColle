import type { Icon } from "@phosphor-icons/react";
import { SectionHeader } from "./section-header";
import { SegmentedPills } from "./segmented-pills";

// A titled section wrapping a SegmentedPills control: at most one selected,
// clicking the current value clears it. Used for the mutually exclusive
// either/or filters (Monochrome vs Colorful, Static vs Variable) where a
// multi-select would only ever produce an empty result. The segmented control's
// flush single-border group is what marks these apart from the multi-select
// pills.
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
      <SegmentedPills
        items={items}
        labels={labels}
        selected={selected}
        onToggle={onToggle}
      />
    </div>
  );
}
