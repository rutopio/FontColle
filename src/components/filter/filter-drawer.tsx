import { FadersHorizontalIcon, FunnelIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { FacetIndex } from "@/lib/fonts/filter/facets";
import type { FilterSearch, FilterState } from "@/lib/fonts/filter/state";
import { activeFilterCount } from "@/lib/fonts/filter/state";
import { usePreview } from "@/lib/preview/context";
import { FilterGroupButton, FilterRail } from "./filter-rail";
import { FilterSidebar } from "./filter-sidebar";
import { type FilterGroupId, PRESET_GROUP } from "./groups";

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
  const { showPreview, setShowPreview } = usePreview();

  return (
    <Drawer open={open} onOpenChange={setOpen} swipeDirection="down">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Filters, ${count} active` : "Filters"}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] md:hidden"
      >
        <FunnelIcon className="size-6" weight="fill" />
        {count > 0 && (
          <Badge
            aria-hidden="true"
            variant="secondary"
            className="absolute -top-1 -right-1 min-w-5 px-1 font-mono text-3xs outline-2 outline-primary"
          >
            {count}
          </Badge>
        )}
      </button>

      <DrawerContent className="h-[85dvh] max-h-[85dvh] gap-0 p-0">
        <DrawerHandle />
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <FunnelIcon className="size-4 text-primary" weight="fill" />
          <DrawerTitle>Filters</DrawerTitle>
          {count > 0 && (
            <span className="text-muted-foreground text-xs">
              {count} active
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            aria-pressed={showPreview}
            className="ml-auto aria-pressed:bg-muted aria-pressed:text-foreground"
          >
            <FadersHorizontalIcon
              data-icon="inline-start"
              weight={showPreview ? "duotone" : "regular"}
            />
            Preview Settings
          </Button>
        </div>
        <div className="flex border-border border-b px-3 pt-2">
          <FilterRail
            active={group}
            filter={filter}
            onSelect={onGroupChange}
            orientation="horizontal"
            indicatorId="filter-drawer-rail-indicator"
          />
          <FilterGroupButton
            group={PRESET_GROUP}
            active={group === PRESET_GROUP.id}
            count={0}
            onSelect={onGroupChange}
            horizontal
            indicatorId="filter-drawer-rail-indicator"
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
