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
  const { presets, remove, restore } = usePresets();
  const full = presets.length >= MAX_PRESETS;

  // Delete confirms with an undo rather than a confirmation dialog first: the
  // row's X is one click and presets exist only in this device's localStorage,
  // so a mis-click is otherwise unrecoverable. The index is captured before the
  // write so restore() can put the row back where it was.
  const onRemove = (preset: FilterPreset, index: number) => {
    remove(preset.id);
    toast.success("Preset deleted", {
      description: preset.name,
      action: { label: "Undo", onClick: () => restore(preset, index) },
    });
  };

  return (
    // min-h-0 + flex-1 only matter when empty: the Empty block below claims the
    // leftover height so it can centre in it. With presets listed, the list is
    // content-height as usual and the flex-1 has nothing to stretch into.
    <div className="flex min-h-0 flex-1 flex-col gap-2">
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
        // No `info`: the other panels explain where their data comes from, but
        // presets are the user's own, and the save popover already states the
        // device-local / keeps-your-sort caveat at the point it matters.
      />

      {presets.length === 0 ? (
        // Matches the results list's own empty state (icon tile, title,
        // description), so an empty panel reads as a deliberate state rather
        // than a section that failed to render. No border: the panel has no
        // other framed block, so a box here would read as a card rather than as
        // the panel's own resting state. Empty's flex-1 + justify-center then
        // centre it in the height the wrapper above claimed.
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
