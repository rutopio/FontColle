import type { Icon } from "@phosphor-icons/react";
import type { MatchMode } from "@/lib/fonts/filter";
import { subTagLabel } from "./constants";
import { Pills } from "./section";
import { SectionHeader } from "./section-header";

export interface ClassificationGroup {
  title: string;
  items: [string, number][];
}

// ONE SectionHeader over all the sub-lists, because they all write to the one
// `style` key and share its OR/AND mode: a per-sub-list header would host that
// toggle on whichever rendered first and silently govern the rest.
export function ClassificationSection({
  title,
  icon,
  groups,
  selected,
  onToggle,
  onReset,
  info,
  mode,
  onToggleMode,
}: {
  title: string;
  icon: Icon;
  groups: ClassificationGroup[];
  selected: string[];
  onToggle: (v: string) => void;
  onReset: () => void;
  info?: React.ReactNode;
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
        info={info}
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
