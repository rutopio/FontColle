import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter";
import { MAX_PRESETS, usePresets } from "@/lib/fonts/presets";
import { cn } from "@/lib/utils";
import { groupActiveFilters } from "./describe";

// A default name built from the same groups the chip row shows ("Serif + Latn
// +2"), so the suggestion always speaks the UI's own vocabulary.
function suggestName(filter: FilterState): string {
  const groups = groupActiveFilters(filter);
  const query = filter.query.trim();
  // One value per group, with the remainder counted once at the end, so the
  // name stays short no matter how many pills are stacked.
  const parts = groups.map((g) => g.values[0].value);
  if (query) parts.unshift(query);
  const extra =
    groups.reduce((n, g) => n + g.values.length - 1, 0) +
    Math.max(0, parts.length - 2);
  const head = parts.slice(0, 2).join(" + ");
  if (!head) return "Untitled";
  return extra > 0 ? `${head} +${extra}` : head;
}

// The single entry point for creating a preset, at the end of the chip row
// because that is where the conditions being saved are already spelled out.
export function SavePresetPopover({
  filter,
  currentSearch,
}: {
  filter: FilterState;
  currentSearch: FilterSearch;
}) {
  const { presets, save } = usePresets();
  const [open, setOpen] = useState(false);
  // Seeded on open, so the suggestion reflects the filter at that moment.
  const [name, setName] = useState("");
  const full = presets.length >= MAX_PRESETS;

  const onOpenChange = (next: boolean) => {
    if (next) setName(suggestName(filter));
    setOpen(next);
  };

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed || full) return;
    save(trimmed, currentSearch);
    setOpen(false);
    // The new preset lands in the Preset panel, usually off screen, so without
    // this the only feedback is the form closing — which reads as cancelling.
    toast.success("Preset saved", { description: trimmed });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          "flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input border-dashed px-2.5 py-2 text-muted-foreground text-xs transition-colors hover:border-foreground hover:text-foreground md:min-h-8 md:py-1"
        )}
      >
        <BookmarkSimpleIcon className="size-3.5 shrink-0" />
        Save to Preset
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Save to Preset</PopoverTitle>
          <PopoverDescription>
            {full
              ? `${MAX_PRESETS} presets saved, the maximum. Remove one from the Preset panel first.`
              : "Stored on this device. Applying it later keeps your sort order and favorites view."}
          </PopoverDescription>
        </PopoverHeader>
        {!full && (
          <>
            {/* Autofocus is safe: the field only exists once the user has
                explicitly opened this popover, and naming is the sole step. */}
            <Input
              autoFocus
              aria-label="Preset name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
            />
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={commit}
                disabled={name.trim().length === 0}
                type="button"
              >
                Save
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
