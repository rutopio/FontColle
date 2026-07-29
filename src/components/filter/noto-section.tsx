import { GoogleLogoIcon } from "@phosphor-icons/react";
import { FLAG_LABELS } from "@/lib/fonts/filter";
import { SectionHeader } from "./section-header";
import { SegmentedPills } from "./segmented-pills";

export function NotoSection({
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
        title="Noto Family"
        icon={GoogleLogoIcon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <SegmentedPills
        items={items}
        labels={FLAG_LABELS}
        selected={selected}
        onToggle={onToggle}
      />
    </div>
  );
}
