import { ShapesIcon } from "@phosphor-icons/react";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";

// The sub-tag name shown on a pill: the last path segment of the full tag
// path ("/Serif/Didone" -> "Didone").
const subTagLabel = (path: string) => path.slice(path.lastIndexOf("/") + 1);

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
}: {
  title: string;
  // [full tag path, count], in fixed order.
  items: [string, number][];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
}) {
  const hasSelection = items.some(([value]) => selected.includes(value));
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        icon={ShapesIcon}
        hasSelection={hasSelection}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
      />
      <Pills
        items={items}
        selected={selected}
        onToggle={onToggle}
        label={subTagLabel}
        expandAll
      />
    </div>
  );
}
