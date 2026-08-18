import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FAB_MOTION, FAB_SHIFT, fabBottom, fabLift } from "./fab-motion";

export function ControlsDrawer({
  title,
  icon: FabIcon,
  dockVisible,
  children,
}: {
  title: string;
  icon: Icon;
  dockVisible: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} swipeDirection="down">
      <motion.button
        {...FAB_MOTION}
        animate={{ ...FAB_MOTION.animate, ...fabLift(dockVisible) }}
        transition={{ ...FAB_MOTION.transition, y: FAB_SHIFT }}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        style={{ bottom: fabBottom(1) }}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <FabIcon className="size-6" weight="fill" />
      </motion.button>

      <DrawerContent className="h-[85dvh] max-h-[85dvh] gap-0 p-0">
        <DrawerHandle />
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <FabIcon className="size-4 text-primary" weight="fill" />
          <DrawerTitle>{title}</DrawerTitle>
        </div>
        <div className="min-h-0 flex-1">{children(() => setOpen(false))}</div>
      </DrawerContent>
    </Drawer>
  );
}
