import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FAB_MOTION, FAB_SHIFT, fabBottom, fabLift } from "./fab-motion";

// Mobile-only (<768px) access to the detail sidebar controls. The desktop
// two-level sidebar collapses to an unreachable Sheet on mobile (see
// app-sidebar), so on the Specimen/Glyphs tabs, the only ones with sidebar
// controls (size/axes/features, Unicode blocks), this floating button opens a
// bottom drawer holding the very same panel. Hidden on desktop and on tabs with
// no controls; the page decides when to render it (inside an AnimatePresence,
// so the FAB can animate out when the tab changes).
//
// Sits one button-height (3.5rem) plus a 1rem gap above LinksDrawer's FAB,
// which holds the lower slot on every tab so it stays put as tabs change.
export function ControlsDrawer({
  title,
  icon: FabIcon,
  dockVisible,
  children,
}: {
  title: string;
  // The tab's own icon, matching its entry in the detail rail (sliders for the
  // preview controls, the glyph grid for Unicode blocks).
  icon: Icon;
  // Drops the FAB with the rest of the stack when the preview dock slides away.
  dockVisible: boolean;
  children: React.ReactNode;
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
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:hidden"
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
        <div className="min-h-0 flex-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
