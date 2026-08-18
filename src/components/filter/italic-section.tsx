import { TextItalicIcon } from "@phosphor-icons/react";
import { ITALIC_LABELS } from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

export function ItalicSection({
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
        title="Italic & Slant"
        icon={TextItalicIcon}
        hasSelection={selected.length > 0}
        onReset={onReset}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        info="Two separate things, so a family can be both. Italic means the family ships italic styles — a redrawn companion, not a tilted roman. Slant Axis means a variable slnt axis you can dial to any angle on the detail page."
      />
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([value, count]) => (
          <PillButton
            key={value}
            value={value}
            count={count}
            label={ITALIC_LABELS[value] ?? value}
            selected={selected.includes(value)}
            onToggle={onToggle}
            className="min-w-0"
          />
        ))}
      </div>
    </div>
  );
}
