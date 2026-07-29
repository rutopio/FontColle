import type { Icon } from "@phosphor-icons/react";
import { SectionHeader } from "./section-header";
import { SegmentedPills } from "./segmented-pills";

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
  items: [string, number][];
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
