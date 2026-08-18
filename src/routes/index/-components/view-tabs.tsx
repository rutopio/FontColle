import { GridFourIcon, ListIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { clampCols, DEFAULT_COLS, type ViewMode } from "@/components/font-grid";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { ColumnChoices } from "./column-choices";

export const VIEW_TABS_WIDTH = "max-md:w-[4.375rem]"; // aligns Reset button width below md

const TABS_LIST = `h-9 bg-accent/50 ${VIEW_TABS_WIDTH}`;

const CLOSE_DELAY_MS = 120;

export function ViewTabs({
  view,
  onChange,
  cols,
  onColsChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
  cols?: number;
  onColsChange?: (next: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  useMountEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  });

  const mobile = useIsMobile();
  const density = onColsChange != null && !mobile;
  const current = clampCols(cols ?? DEFAULT_COLS);

  const gridTrigger = (
    <TabsTrigger
      value="grid"
      aria-label="Grid view"
      className="h-full sm:h-full"
    >
      <span className="hidden sm:inline">Grid</span>
      <GridFourIcon className="size-4" />
    </TabsTrigger>
  );

  return (
    <Tabs value={view} onValueChange={(v) => onChange(v as ViewMode)}>
      <TabsList className={TABS_LIST}>
        {density ? (
          <Popover open={open && view === "grid"} onOpenChange={setOpen}>
            <PopoverTrigger
              render={gridTrigger}
              onMouseEnter={() => {
                cancelClose();
                setOpen(true);
              }}
              onMouseLeave={scheduleClose}
            />
            <PopoverContent
              align="end"
              className="w-auto min-w-0 gap-1 p-1"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <ColumnChoices
                current={current}
                onSelect={(n) => {
                  onColsChange?.(n);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        ) : (
          gridTrigger
        )}
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
