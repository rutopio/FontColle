import { BookmarkSimpleIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter";
import {
  type FilterPreset,
  MAX_PRESETS,
  sameSearch,
  usePresets,
} from "@/lib/fonts/presets";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";
import { SectionHeader } from "./section-header";

// A default name for the filter about to be saved, built from the same section
// groups the chip row shows: "Sans + Hant", "Serif + Latn +2". Reusing
// groupActiveFilters means the suggestion always speaks the UI's own vocabulary,
// and the user starts from something editable rather than an empty field.
function suggestName(filter: FilterState): string {
  const groups = groupActiveFilters(filter);
  const query = filter.query.trim();
  // Each group contributes its first value; a group with more says so once at
  // the end, so the name stays short no matter how many pills are stacked.
  const parts = groups.map((g) => g.values[0].value);
  if (query) parts.unshift(query);
  const extra =
    groups.reduce((n, g) => n + g.values.length - 1, 0) +
    Math.max(0, parts.length - 2);
  const head = parts.slice(0, 2).join(" + ");
  if (!head) return "Untitled";
  return extra > 0 ? `${head} +${extra}` : head;
}

// How many conditions a saved preset holds, for its subtitle. Counts the search
// params rather than re-deriving a FilterState: every key present in a stored
// search is exactly one active section, which is what the label should say.
const conditionCount = (search: FilterSearch) =>
  Object.values(search).filter((v) => v !== undefined).length;

// The Preset panel: save the current filter under a name, then re-apply it in
// one click. Presets are device-local (localStorage), like favorites and the
// view mode — a shared URL is still the way to hand a filter to someone else.
export function PresetSection({
  filter,
  currentSearch,
  hasFilters,
  onApply,
}: {
  // Live filter, for the suggested name.
  filter: FilterState;
  // The current filter encoded as search params, compared against each stored
  // preset to mark the active one.
  currentSearch: FilterSearch;
  // False when nothing is filtered — there'd be nothing to save.
  hasFilters: boolean;
  onApply: (search: FilterSearch) => void;
}) {
  const { presets, save, remove } = usePresets();
  // The name field is only mounted while saving, so the suggestion is computed
  // fresh from the filter as it stood when Save was clicked.
  const [draft, setDraft] = useState<string | null>(null);
  const full = presets.length >= MAX_PRESETS;

  const commit = () => {
    const name = (draft ?? "").trim();
    if (name) save(name, currentSearch);
    setDraft(null);
  };

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

      {presets.length === 0 && draft === null && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Set up a filter you use often, then save it here to bring it back in
          one click.
        </p>
      )}

      {presets.length > 0 && (
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

      {draft === null ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          // Nothing filtered = nothing to save; a full list needs a delete first.
          disabled={!hasFilters || full}
          onClick={() => setDraft(suggestName(filter))}
        >
          <BookmarkSimpleIcon className="size-3.5" />
          Save current filters
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {/* Autofocus is safe here: the field only exists after an explicit
              Save click, and typing a name is the sole next step. */}
          <Input
            autoFocus
            aria-label="Preset name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setDraft(null);
            }}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Save preset"
            disabled={draft.trim().length === 0}
            onClick={commit}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel"
            onClick={() => setDraft(null)}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      {full && draft === null && (
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
