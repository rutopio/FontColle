import type { Icon } from "@phosphor-icons/react";
import type { MatchMode } from "@/lib/fonts/filter";
import { subTagLabel } from "./constants";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";

// One sub-list of classification pills (Serif, Sans Serif, Slab, Script, …).
export interface ClassificationGroup {
  title: string;
  // [full tag path, count], in fixed order.
  items: [string, number][];
}

// The classification sections under a single heading, shaped like Features:
// one SectionHeader over sub-lists labelled by a plain <h3>.
//
// Previously each sub-list carried its own SectionHeader, which misrepresented
// the state: Serif/Sans/Slab/Script all write to the one `classifications` key
// and therefore share one OR/AND mode, so the toggle was hosted on whichever
// section happened to render first (Sans Serif) and silently governed the rest.
// Hoisting it to a group header puts the control at the scope it actually
// applies to, and reset now clears the whole group rather than one sub-list.
export function ClassificationSection({
  title,
  icon,
  groups,
  selected,
  onToggle,
  onReset,
  mode,
  onToggleMode,
}: {
  title: string;
  // Matches the rail button's icon for this group, so the panel header and the
  // rail read as the same thing.
  icon: Icon;
  groups: ClassificationGroup[];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  mode?: MatchMode;
  onToggleMode?: () => void;
}) {
  const hasSelection = groups.some(({ items }) =>
    items.some(([value]) => selected.includes(value))
  );
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        icon={icon}
        hasSelection={hasSelection}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        mode={mode}
        onToggleMode={onToggleMode}
      />
      <div className="flex flex-col gap-8">
        {groups.map(({ title: groupTitle, items }) => (
          <div key={groupTitle} className="flex flex-col gap-2">
            <h3 className="font-medium text-muted-foreground text-xs uppercase">
              {groupTitle}
            </h3>
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
        ))}
      </div>
    </div>
  );
}
