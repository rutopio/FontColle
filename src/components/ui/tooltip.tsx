"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { fontWeights } from "@/lib/font-weight";

const TooltipPortalContainerContext = createContext<HTMLElement | null>(null);

function TooltipPortalContainer({
  value,
  children,
}: {
  value: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <TooltipPortalContainerContext.Provider value={value}>
      {children}
    </TooltipPortalContainerContext.Provider>
  );
}

const DEFAULT_DELAY = 200;

// Per-instance Provider breaks skip-delay grouping between adjacent tooltips.
const TooltipGroupContext = createContext(false);

interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}

function TooltipProvider({
  children,
  delayDuration = DEFAULT_DELAY,
  skipDelayDuration = 300,
}: TooltipProviderProps) {
  return (
    <TooltipGroupContext.Provider value={true}>
      <TooltipPrimitive.Provider
        delay={delayDuration}
        timeout={skipDelayDuration}
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipGroupContext.Provider>
  );
}

type TooltipSide = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  content: ReactNode;
  children: React.ReactElement;
  side?: TooltipSide;
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function getSlideOffset(side: TooltipSide) {
  switch (side) {
    case "top":
      return { y: 4 };
    case "bottom":
      return { y: -4 };
    case "left":
      return { x: 4 };
    case "right":
      return { x: -4 };
  }
}

function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 8,
  delayDuration,
  className,
  forceOpen,
  onOpenChange: onOpenChangeProp,
}: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = forceOpen !== undefined ? forceOpen : internalOpen;
  const portalContainer = useContext(TooltipPortalContainerContext);
  const hasAmbientProvider = useContext(TooltipGroupContext);

  const slideOffset = getSlideOffset(side);

  const tooltip = (
    <TooltipPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        setInternalOpen(v);
        onOpenChangeProp?.(v);
      }}
    >
      <TooltipPrimitive.Trigger render={children} delay={delayDuration} />
      <TooltipPrimitive.Portal container={portalContainer ?? undefined}>
        <TooltipPrimitive.Positioner
          side={side}
          sideOffset={sideOffset}
          className="z-50"
        >
          <TooltipPrimitive.Popup
            render={(props, state) => {
              const exiting = state.transitionStatus === "ending";
              const {
                style: baseStyle,
                // motion owns drag/animation handlers; strip React-DOM versions.
                onDrag: _onDrag,
                onDragStart: _onDragStart,
                onDragEnd: _onDragEnd,
                onAnimationStart: _onAnimationStart,
                onAnimationEnd: _onAnimationEnd,
                onAnimationIteration: _onAnimationIteration,
                ...rest
              } = props as React.HTMLAttributes<HTMLDivElement>;
              return (
                <motion.div
                  {...rest}
                  className={cn(
                    // py-2 only where trim is supported — keeps ~26px height elsewhere.
                    "bg-foreground text-background text-[12px] px-2 py-1",
                    "[text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both]:py-2",
                    "rounded-lg",
                    className
                  )}
                  style={{
                    ...(baseStyle as React.CSSProperties | undefined),
                    fontVariationSettings: fontWeights.medium,
                  }}
                  initial={{ opacity: 0, ...slideOffset }}
                  animate={
                    exiting
                      ? { opacity: 0, ...slideOffset }
                      : { opacity: 1, x: 0, y: 0 }
                  }
                  transition={exiting ? spring.fast.exit : spring.fast}
                />
              );
            }}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );

  if (hasAmbientProvider) return tooltip;

  return (
    <TooltipPrimitive.Provider delay={delayDuration ?? DEFAULT_DELAY}>
      {tooltip}
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip, TooltipPortalContainer, TooltipProvider };
export type { TooltipProps, TooltipProviderProps, TooltipSide };
