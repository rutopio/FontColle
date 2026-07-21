import { GoogleLogoIcon } from "@phosphor-icons/react";
import { FLAG_LABELS } from "@/lib/fonts/filter";
import { SectionHeader } from "./section-header";
import { SegmentedPills } from "./segmented-pills";

// Noto filter: Noto / Others, two per row. Radio-style, at most one, and they
// partition the catalog (every published family is Noto or not). Selecting one
// clears the other; re-clicking the active one clears it.
export function NotoSection({
  items,
  selected,
  onToggle,
  onReset,
}: {
  // [flagId, count], e.g. ["noto", 200]. Fixed order.
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
