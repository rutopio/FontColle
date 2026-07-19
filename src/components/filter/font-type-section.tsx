import { CubeIcon } from "@phosphor-icons/react";
import { RadioPillSection } from "./radio-pill-section";

const TYPE_LABELS = { static: "Static Only", variable: "Variable" };

// Static vs Variable, radio-style. Stored as the static/variable `facets`
// values, but this is their only entry point, buildFacetIndex keeps them out
// of the Tag list. Sits above the variable axes because those only exist
// for variable fonts, and this says which. Radio rather than multi-select: a
// font is one or the other, so selecting both (facets are AND-ed) could only
// ever return nothing.
export function FontTypeSection({
  items,
  selected,
  onToggle,
  onReset,
}: {
  // [value, count] where value is "static" | "variable".
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
