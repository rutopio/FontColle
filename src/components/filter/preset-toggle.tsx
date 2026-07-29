import { FilterGroupButton } from "./filter-rail";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

export function PresetToggle({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (id: FilterGroupId) => void;
}) {
  return (
    <nav aria-label="Presets" className="flex flex-col gap-1">
      <FilterGroupButton
        group={PRESET_GROUP}
        active={active}
        count={0}
        onSelect={onSelect}
      />
    </nav>
  );
}
