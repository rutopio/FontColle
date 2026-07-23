"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Swipe-dismissable bottom sheet, on Base UI's Drawer primitive.
//
// Distinct from ui/sheet.tsx, which stays as-is: Sheet is Dialog-based, opens
// from any of four sides, and has six callers. This is bottom-only and exists
// for the one surface where a drag gesture matters (the mobile filter drawer),
// so the two are not merged.
//
// The primitive owns the physics: it tracks the pointer 1:1, projects a release
// by velocity (not just distance), and stays interruptible mid-flight. We only
// supply the visuals, and read the CSS vars it publishes.

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

// The dim tracks the drag: --drawer-swipe-progress runs 0 → 1 as the sheet is
// pulled down, so the backdrop lightens under the finger instead of holding
// full strength until the sheet is gone. 0.1 at rest matches ui/sheet.tsx's
// bg-black/10. Feedback stays continuous *during* the gesture, not only at its
// end — hence duration-0 while swiping, so the dim sits exactly where the
// finger is instead of easing behind it.
function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black opacity-[calc(0.1*(1-var(--drawer-swipe-progress,0)))] transition-opacity duration-[var(--motion-slow)] ease-[var(--ease-drawer)] supports-backdrop-filter:backdrop-blur-xs data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0",
        className
      )}
      {...props}
    />
  );
}

// The grab affordance. Nothing is wired to it: the whole popup is draggable,
// and the handle's job is to say so — same call shadcn's Drawer makes, which
// ships no X either and lets the handle advertise the gesture.
//
// aria-hidden because it is decoration, not a control: it has no press target
// of its own, so exposing it would announce something a keyboard user cannot
// action. Their exits are Escape and the backdrop, both from the Dialog
// primitive underneath. A caller that wants a visible button composes
// DrawerClose itself.
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
      {/* Viewport is the drag surface and the scroll owner. It is what lets an
          inner scroller coexist with the gesture: the sheet only drags when
          that scroller is already at the top, so a filter list scrolls
          normally and does not fight the swipe. */}
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-50 flex flex-col justify-end"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-t-xl border-t bg-popover bg-clip-padding text-popover-foreground text-sm shadow-lg outline-none",
            // The popup does not move itself: this binds it to the pointer.
            // --drawer-swipe-movement-y is the live 1:1 drag offset, so the
            // sheet stays glued to the finger for the whole gesture.
            //
            // The 0px fallback is load-bearing, not defensive. Base UI only
            // registers this var's initialValue behind a
            // `'registerProperty' in CSS` guard (drawer/popup/DrawerPopup.mjs),
            // so where that guard fails the var is unset, translateY() is
            // invalid, and the WHOLE transform declaration is dropped at
            // computed-value time — taking the sheet's baseline position with
            // it. The other two vars in this file already carry fallbacks.
            "[transform:translateY(var(--drawer-swipe-movement-y,0px))]",
            "transition-transform duration-[var(--motion-slow)] ease-[var(--ease-drawer)]",
            // duration-0 while dragging (a transition would lag the finger),
            // and on release the primitive scales the exit by
            // --drawer-swipe-strength, so a hard flick settles faster than a
            // slow drag. That is the gesture's velocity carrying into the
            // animation rather than being discarded at the seam.
            //
            // will-change only while data-swiping is present: promoting the
            // sheet to its own layer avoids a hitch on the first drag frame,
            // and dropping it the moment the gesture ends keeps a full-width,
            // 85dvh layer from sitting in GPU memory for the whole session.
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
