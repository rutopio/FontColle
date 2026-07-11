import { NoteBlankIcon } from "@phosphor-icons/react";
import type { MatchMode } from "@/lib/fonts/filter";
import { subTagLabel } from "./constants";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";

// One classification section (Serif, Sans Serif, Slab, Script): a header
// over a wrapping list of its sub-tag pills. Multi-select, OR within the shared
// `classifications` FilterState field. Pills carry the full tag path as value;
// only the sub-tag name is shown.
export function ClassificationSection({
  title,
  items,
  selected,
  onToggle,
  onReset,
  mode,
  onToggleMode,
}: {
  title: string;
  // [full tag path, count], in fixed order.
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  // OR/AND toggle. All classification sub-sections share one `classifications`
  // state key, so the sidebar passes these to just one of them.
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  const hasSelection = items.some(([value]) => selected.includes(value));
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        icon={NoteBlankIcon}
        hasSelection={hasSelection}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <Pills
        items={items}
        selected={selected}
        onToggle={onToggle}
        label={subTagLabel}
        grid
        columns={2}
        spread
        expandAll
      />
    </div>
  );
}
