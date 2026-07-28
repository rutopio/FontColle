import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FAB_MOTION, FAB_SHIFT, fabBottom, fabLift } from "./fab-motion";

// The preview controls for viewports below lg, where the body has no room for
// the column that holds them beside the content: this FAB opens a drawer with
// the very same panel. Stacks above LinksDrawer's FAB.
export function ControlsDrawer({
  title,
  icon: FabIcon,
  dockVisible,
  children,
}: {
  title: string;
  icon: Icon;
  dockVisible: boolean;
  // A render prop, so the panel can dismiss the drawer after a one-shot choice
  // like picking a Unicode block.
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <motion.button
        {...FAB_MOTION}
        animate={{ ...FAB_MOTION.animate, ...fabLift(dockVisible) }}
        transition={{ ...FAB_MOTION.transition, y: FAB_SHIFT }}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        style={{ bottom: fabBottom(1) }}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:hidden"
      >
        <FabIcon className="size-6" weight="fill" />
      </motion.button>

      <SheetContent
        side="bottom"
        className="h-[85dvh]! gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <FabIcon className="size-4 text-primary" weight="fill" />
          <SheetTitle>{title}</SheetTitle>
        </div>
        {/* The scroller lives here rather than in the panels: on desktop they
            sit in the page's own scroll body and must not trap it. */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">{children(() => setOpen(false))}</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
