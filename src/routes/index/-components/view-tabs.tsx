import { RowsIcon, SquaresFourIcon } from "@phosphor-icons/react";
import type { ViewMode } from "@/components/font-grid";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* Height only. The colours are the default variant's own — a --muted slot with
   a --background pill — so this control matches every other TabsList in the
   app. An earlier version inverted them into a white slot with a tinted pill
   to sit closer to SortControl's frame; that put the selected state 0.03
   lightness off its own slot and stopped reading as selected at all. */
const TABS_LIST = "h-9";

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
