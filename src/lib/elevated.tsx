"use client";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from "react";
import { surfaceClasses } from "@/lib/surface-classes";
import { SurfaceProvider, useSurface } from "@/lib/surface-context";
import { cn } from "@/lib/utils";

interface ElevatedProps extends ComponentPropsWithoutRef<"div"> {
  /** Steps above the current substrate. Capped at 8. */
  offset: number;
  /** Override shadow level (defaults to computed surface level). */
  shadowLevel?: number;
  children?: ReactNode;
}

const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, ...props }, ref) => {
    const substrate = useSurface();
    const level = Math.min(substrate + offset, 8);
    return (
      <SurfaceProvider value={level}>
        <div
          ref={ref}
          className={cn(surfaceClasses(level, shadowLevel ?? level), className)}
          {...props}
        >
          {children}
        </div>
      </SurfaceProvider>
    );
  }
);
Elevated.displayName = "Elevated";

export { Elevated };
