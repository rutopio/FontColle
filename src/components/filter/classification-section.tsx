import { ShapesIcon } from "@phosphor-icons/react";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";

// A few sub-tags carry a longer internal name than Google Fonts shows on its
// own UI. The tag path stays the harvest key; only the pill label is aligned
// to Google Fonts' shorter wording.
const GF_LABEL: Record<string, string> = {
  "Old Style Garalde": "Old Style",
  "Humanist Venetian": "Humanist",
  "Fat Face": "Fatface",
  "Upright Script": "Upright",
};

// The sub-tag name shown on a pill: the last path segment of the full tag
// path ("/Serif/Didone" -> "Didone"), overridden by GF_LABEL where it differs
// from Google Fonts' own label.
const subTagLabel = (path: string) => {
  const seg = path.slice(path.lastIndexOf("/") + 1);
  return GF_LABEL[seg] ?? seg;
};

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
        grid
        columns={2}
        spread
        expandAll
      />
    </div>
  );
}
