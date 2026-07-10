import { GoogleLogoIcon } from "@phosphor-icons/react";
import { FLAG_LABELS } from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

// Source filter: Noto / Others, two per row. Radio-style — at most one, and
// they partition the catalog (every published family is Noto or not). Selecting
// one clears the other; re-clicking the active one clears it.
export function SourceSection({
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
        title="Source"
        icon={GoogleLogoIcon}
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
            label={FLAG_LABELS[value] ?? value}
            selected={selected.includes(value)}
            onToggle={onToggle}
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
