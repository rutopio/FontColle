import { RowsIcon, SquaresFourIcon } from "@phosphor-icons/react";
import type { ViewMode } from "@/components/font-grid";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* White slot with a gray selected pill, inverting the default variant's gray
   slot and white pill. The header is transparent over the sidebar tint, so a
   gray slot would read as a smudge next to SortControl; matching its
   `border-input bg-background` frame keeps the two controls one set. */
const TABS_LIST =
  "h-9 border border-input bg-background dark:bg-input/30 [&_[data-slot=tab-indicator]]:bg-muted [&_[data-slot=tab-indicator]]:shadow-none dark:[&_[data-slot=tab-indicator]]:bg-input/50";

export function ViewTabs({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <Tabs value={view} onValueChange={(v) => onChange(v as ViewMode)}>
      <TabsList className={TABS_LIST}>
        <TabsTrigger
          value="grid"
          aria-label="Grid view"
          className="h-full sm:h-full"
        >
          <span className="hidden sm:inline">Grid</span>
          <SquaresFourIcon className="size-4" />
        </TabsTrigger>
        <TabsTrigger
          value="row"
          aria-label="Row view"
          className="h-full sm:h-full"
        >
          <span className="hidden sm:inline">Row</span>
          <RowsIcon className="size-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
