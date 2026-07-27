import { BookmarkSimpleIcon, XIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { FilterSearch } from "@/lib/fonts/filter";
import {
  type FilterPreset,
  MAX_PRESETS,
  sameSearch,
  usePresets,
} from "@/lib/fonts/presets";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

// Counts search params rather than re-deriving a FilterState: every key present
// in a stored search is exactly one active section.
const conditionCount = (search: FilterSearch) =>
  Object.values(search).filter((v) => v !== undefined).length;

// Creating a preset happens at the chip row's "Save to Preset" popover, the
// single entry point, so naming happens beside the conditions being named.
export function PresetSection({
  currentSearch,
  onApply,
}: {
  // Compared against each stored preset to mark the active one.
  currentSearch: FilterSearch;
  onApply: (search: FilterSearch) => void;
}) {
  const { presets, remove, restore } = usePresets();
  const full = presets.length >= MAX_PRESETS;

  // Undo rather than a confirmation dialog: the X is one click and presets are
  // device-local, so a mis-click is otherwise unrecoverable. The index is
  // captured before the write so restore() can put the row back where it was.
  const onRemove = (preset: FilterPreset, index: number) => {
    remove(preset.id);
    toast.success("Preset deleted", {
      description: preset.name,
      action: { label: "Undo", onClick: () => restore(preset, index) },
    });
  };

  return (
    // Only matters when empty: the Empty block below centres in this height.
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <SectionHeader
        title="Preset"
        icon={BookmarkSimpleIcon}
        // Not a selection: removal is per-row and there is nothing to reorder.
        hasSelection={false}
        onReset={() => {}}
        canSort={false}
        sort="count"
        onToggleSort={() => {}}
        // No `info`: presets are the user's own data, and the save popover
        // already states the device-local caveat where it matters.
      />

      {presets.length === 0 ? (
        // No border: the panel frames nothing else, so a box would read as a
        // card rather than as the panel's own resting state.
        <Empty className="gap-3 px-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookmarkSimpleIcon />
            </EmptyMedia>
            <EmptyTitle>No presets yet</EmptyTitle>
            <EmptyDescription className="text-xs">
              Filter the catalog, then use “Save to Preset” above the results to
              keep that combination here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-1">
          {presets.map((preset, index) => (
            <PresetRow
              key={preset.id}
              preset={preset}
              active={sameSearch(preset.search, currentSearch)}
              onApply={() => onApply(preset.search)}
              onRemove={() => onRemove(preset, index)}
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

// The X is a SIBLING of the apply button, not nested: a button inside a button
// is invalid, and it would inherit the row's click.
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
