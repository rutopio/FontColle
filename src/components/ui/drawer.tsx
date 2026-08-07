"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black opacity-[calc(0.1*(1-var(--drawer-swipe-progress,0)))] transition-opacity duration-slow ease-drawer supports-backdrop-filter:backdrop-blur-xs data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0",
        className
      )}
      {...props}
    />
  );
}

function DrawerHandle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-handle"
      aria-hidden
      className={cn("flex shrink-0 justify-center pt-2 pb-1", className)}
      {...props}
    >
      <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-50 flex flex-col justify-end"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-t-xl border-t bg-popover bg-clip-padding text-popover-foreground text-sm shadow-lg outline-none",
            // Base UI registers --drawer-swipe-movement-y behind a feature guard; 0px keeps transform valid.
            "[transform:translateY(var(--drawer-swipe-movement-y,0px))]",
            "transition-transform duration-slow ease-drawer",
            "data-swiping:will-change-transform data-swiping:select-none data-swiping:duration-0",
            "data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]",
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--motion-slow))]",
            className
          )}
          {...props}
        >
          {children}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading font-medium text-base text-foreground",
        className
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerHeader,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
