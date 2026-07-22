import { FilterGroupButton } from "./filter-rail";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

// The rail-footer Preset control. It switches the side panel to the Preset
// group exactly like a rail button, but renders down in the footer next to
// Favorite: presets and favorites are the two device-local personal things
// (both localStorage, neither shareable via URL), so they sit together above
// the separator that divides them from the app-level toggles (theme, about).
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
