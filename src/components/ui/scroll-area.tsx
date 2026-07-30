"use client"

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import type * as React from "react"

import { cn } from "@/lib/utils"

// Spelled out so Tailwind's scanner sees each class; a template string built
// from `fade` would never be generated.
const FADE_CLASS = {
  y: "scroll-fade-y",
  x: "scroll-fade-x",
  t: "scroll-fade-t",
  b: "scroll-fade-b",
  l: "scroll-fade-l",
  r: "scroll-fade-r",
  s: "scroll-fade-s",
  e: "scroll-fade-e",
} as const

function ScrollArea({
  className,
  children,
  viewportRef,
  fade,
  viewportClassName,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  viewportRef?: React.Ref<HTMLDivElement>
  /**
   * Fade the scrollable edges with the `scroll-fade` mask utilities. `true` is
   * the vertical fade; pass an axis or edge for the others.
   */
  fade?: boolean | "y" | "x" | "t" | "b" | "l" | "r" | "s" | "e"
  viewportClassName?: string
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full overscroll-contain rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          // Must land on the viewport, not the root: the utility keys off
          // `scroll(self)`, so it only resolves on the element that scrolls.
          fade === true && "scroll-fade",
          typeof fade === "string" && FADE_CLASS[fade],
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none p-px transition-colors",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
