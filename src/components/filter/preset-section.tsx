import { BookmarkSimpleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { FilterSearch } from "@/lib/fonts/filter";
import {
  type FilterPreset,
  MAX_PRESETS,
  sameSearch,
  usePresets,
} from "@/lib/fonts/presets";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// How many conditions a saved preset holds, for its subtitle. Counts the search
// params rather than re-deriving a FilterState: every key present in a stored
// search is exactly one active section, which is what the label should say.
const conditionCount = (search: FilterSearch) =>
  Object.values(search).filter((v) => v !== undefined).length;

// The Preset panel: lists saved filter combinations, applies one in a click,
// and deletes them. Creating a preset happens elsewhere — the "Save to Preset"
// popover at the end of the active-filter chip row is the single entry point,
// so naming always happens next to the conditions being named. Presets are
// device-local (localStorage), like favorites and the view mode; a shared URL
// is still the way to hand a filter to someone else.
export function PresetSection({
  currentSearch,
  onApply,
}: {
  // The current filter encoded as search params, compared against each stored
  // preset to mark the active one.
  currentSearch: FilterSearch;
  onApply: (search: FilterSearch) => void;
}) {
  const { presets, remove } = usePresets();
  const full = presets.length >= MAX_PRESETS;

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader
        title="Preset"
        icon={BookmarkSimpleIcon}
        // Presets aren't a selection, so the header's Reset/Sort slot stays
        // empty: removing one is per-row, and there is nothing to reorder.
        hasSelection={false}
        onReset={() => {}}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        info="Saved filter combinations, stored on this device only. Applying one replaces the current filters but keeps your sort order and favorites view."
      />

      {presets.length === 0 ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Filter the catalog, then use “Save to Preset” above the results to
          keep that combination here.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {presets.map((preset) => (
            <PresetRow
              key={preset.id}
              preset={preset}
              active={sameSearch(preset.search, currentSearch)}
              onApply={() => onApply(preset.search)}
              onRemove={() => remove(preset.id)}
            />
          ))}
        </ul>
      )}

      {full && (
        <p className="text-muted-foreground text-xs">
          {MAX_PRESETS} presets saved, the maximum. Remove one to save another.
        </p>
      )}
    </div>
  );
}

// One saved preset: a wide apply button with a delete X pinned to its right.
// The two are siblings rather than nested, a button inside a button is invalid
// and the X would inherit the row's click.
function PresetRow({
  preset,
  active,
  onApply,
  onRemove,
}: {
  preset: FilterPreset;
  active: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
  const count = conditionCount(preset.search);
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onApply}
        aria-pressed={active}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors",
          active
            ? "border-primary bg-primary/5 text-foreground"
            : "border-input text-muted-foreground hover:border-foreground hover:text-foreground"
        )}
      >
        <span className="truncate text-sm">{preset.name}</span>
        <span className="shrink-0 font-mono text-[10px] opacity-60">
          {count}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete preset ${preset.name}`}
        onClick={onRemove}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <XIcon className="size-3.5" />
      </Button>
    </li>
  );
}
