import { FilterGroupButton } from "./filter-rail";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

// The Preset control. It switches the side panel to the Preset group exactly
// like a rail button.
//
// Rendered only on the list page: the detail route has no filter panel to
// switch to. Carries no badge — a preset is a shortcut to a set of conditions,
// not a condition itself (see PRESET_GROUP).
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
