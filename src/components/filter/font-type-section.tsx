import { CubeIcon } from "@phosphor-icons/react";
import { RadioPillSection } from "./radio-pill-section";

const TYPE_LABELS = { static: "Static Only", variable: "Variable" };

export function FontTypeSection({
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
    <RadioPillSection
      title="Variable Support"
      icon={CubeIcon}
      items={items}
      labels={TYPE_LABELS}
      selected={selected}
      onToggle={onToggle}
      onReset={onReset}
    />
  );
}
