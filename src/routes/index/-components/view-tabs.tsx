import { RowsIcon, SquaresFourIcon } from "@phosphor-icons/react";
import type { ViewMode } from "@/components/font-grid";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* The one TabsList sitting on --canvas rather than a card, where the stock
   --muted slot lands 0.015 off the page and disappears. accent/50 is what the
   rail's buttons hover to, so the two match over the canvas. */
const TABS_LIST = "h-9 bg-accent/50";

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
