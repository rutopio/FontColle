import { FunnelIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { FacetIndex } from "@/lib/fonts/filter/facets";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter/state";
import { activeFilterCount } from "@/lib/fonts/filter/state";
import { FilterGroupButton, FilterRail } from "./filter-rail";
import { FilterSidebar } from "./filter-sidebar";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

// The sole way to filter on mobile, where the desktop rail and panel collapse
// to an unreachable Sheet (see app-sidebar). Filter state is shared, so it
// needs no Apply button.
//
// Built on Base UI's Drawer, not ui/sheet: this covers 85% of the screen, and
// a panel that large has to be dismissable by dragging it down.
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
    <Drawer open={open} onOpenChange={setOpen} swipeDirection="down">
      {/* FAB: sits above the preview-dock footer (bottom-20) and below the
          drawer backdrop (z-40 vs the backdrop's z-50). safe-area padding
          clears the iOS home indicator. */}
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

      {/* max-h overrides the component default so 85dvh is the real height:
          the popup frame stays fixed and only FilterSidebar's ScrollArea
          scrolls, which is what keeps the drag and the scroll from fighting. */}
      <DrawerContent className="h-[85dvh] max-h-[85dvh] gap-0 p-0">
        <DrawerHandle />
        {/* DrawerTitle also satisfies the dialog's required accessible name. */}
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <FunnelIcon className="size-4 text-primary" weight="fill" />
          <DrawerTitle>Filters</DrawerTitle>
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
            onActiveGroupChange={onGroupChange}
            axisValues={axisValues}
            onAxisValueChange={onAxisValueChange}
            onApplyPreset={onApplyPreset}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
