import { FunnelIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { FacetIndex } from "@/lib/fonts/filter/facets";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter/state";
import { activeFilterCount } from "@/lib/fonts/filter/state";
import { FilterGroupButton, FilterRail } from "./filter-rail";
import { FilterSidebar } from "./filter-sidebar";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

// Mobile-only (<768px) filter access. The desktop rail + panel collapse to an
// unreachable Sheet on mobile (see app-sidebar), so this is the sole way to
// filter there: a bottom-right FAB opens a bottom drawer holding the same
// controls, a horizontal FilterRail group switcher over the FilterSidebar. All
// filter state is shared (FilterProvider is at the root), so changes reflect
// live and the drawer needs no Apply button. Hidden on desktop via md:hidden.
export function FilterDrawer({
  index,
  filter,
  onChange,
  group,
  onGroupChange,
  axisValues,
  onAxisValueChange,
  onApplyPreset,
}: {
  index: FacetIndex;
  filter: FilterState;
  onChange: (next: FilterState) => void;
  group: FilterGroupId;
  onGroupChange: (id: FilterGroupId) => void;
  axisValues: Record<string, number>;
  onAxisValueChange: (tag: string, pct: number) => void;
  onApplyPreset: (search: FilterSearch) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filter);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* FAB: sits above the preview-dock footer (bottom-20) and below the Sheet
          overlay (z-40 vs the overlay's z-50). safe-area padding clears the iOS
          home indicator. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Filters, ${count} active` : "Filters"}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-sidebar-ring active:scale-[0.96] md:hidden"
      >
        <FunnelIcon className="size-6" weight="fill" />
        {count > 0 && (
          <Badge
            aria-hidden="true"
            variant="secondary"
            className="absolute -top-1 -right-1 min-w-5 px-1 font-mono text-[10px] outline-2 outline-primary"
          >
            {count}
          </Badge>
        )}
      </button>

      <SheetContent
        side="bottom"
        className="h-[85dvh]! gap-0 overflow-hidden p-0"
      >
        {/* SheetTitle also satisfies the dialog's required accessible name. */}
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <FunnelIcon className="size-4 text-primary" weight="fill" />
          <SheetTitle>Filters</SheetTitle>
          {count > 0 && (
            <span className="text-muted-foreground text-xs">
              {count} active
            </span>
          )}
        </div>
        {/* Horizontal group switcher, then the group's sections. The rail lives
            in its own padded strip; FilterSidebar brings its own ScrollArea.
            Preset is appended here rather than rendered with Favorite as on
            desktop: the drawer has no sidebar footer, so this strip is mobile's
            only way into the panel, and leaving it out would strand presets. */}
        <div className="flex border-border border-b px-3 pt-2">
          <FilterRail
            active={group}
            filter={filter}
            onSelect={onGroupChange}
            orientation="horizontal"
          />
          <FilterGroupButton
            group={PRESET_GROUP}
            active={group === PRESET_GROUP.id}
            count={0}
            onSelect={onGroupChange}
            horizontal
          />
        </div>
        <div className="min-h-0 flex-1">
          <FilterSidebar
            index={index}
            filter={filter}
            onChange={onChange}
            group={group}
            axisValues={axisValues}
            onAxisValueChange={onAxisValueChange}
            onApplyPreset={onApplyPreset}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
