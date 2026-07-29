import { FilterGroupButton } from "./filter-rail";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

export function PresetToggle({
  active,
  onSelect,
  indicatorId,
}: {
  active: boolean;
  onSelect: (id: FilterGroupId) => void;
  indicatorId: string;
}) {
  return (
    <nav aria-label="Presets" className="flex flex-col gap-1">
      <FilterGroupButton
        group={PRESET_GROUP}
        active={active}
        count={0}
        onSelect={onSelect}
        indicatorId={indicatorId}
      />
    </nav>
  );
}
