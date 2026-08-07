import { GridFourIcon, ListIcon } from "@phosphor-icons/react";
import type { ViewMode } from "@/components/font-grid";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const VIEW_TABS_WIDTH = "max-md:w-[4.375rem]"; // aligns Reset button width below md

const TABS_LIST = `h-9 bg-accent/50 ${VIEW_TABS_WIDTH}`;

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
          <GridFourIcon className="size-4" />
        </TabsTrigger>
        <TabsTrigger
          value="row"
          aria-label="Row view"
          className="h-full sm:h-full"
        >
          <span className="hidden sm:inline">Row</span>
          <ListIcon className="size-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
