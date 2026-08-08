"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  type HTMLAttributes,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  useProximityHover,
  useRegisterProximityItem,
} from "@/hooks/use-proximity-hover";
import { spring } from "@/lib/motion";

interface HeaderButtonGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
}

const HeaderButtonGroupContext =
  createContext<HeaderButtonGroupContextValue | null>(null);

function HeaderButtonGroup({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    activeIndex,
    itemRects,
    sessionRef,
    handlers,
    registerItem,
    isMeasured,
  } = useProximityHover(containerRef, { axis: "x" });

  const activeRect =
    activeIndex !== null && isMeasured ? itemRects[activeIndex] : null;

  const contextValue = useMemo(
    () => ({ registerItem, activeIndex }),
    [registerItem, activeIndex]
  );

  return (
    <HeaderButtonGroupContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: proximity-hover container needs mouse handlers on a layout div */}
      <div
        ref={containerRef}
        data-proximity-group
        className={`isolate ${className ?? ""}`}
        onMouseEnter={handlers.onMouseEnter}
        onMouseMove={handlers.onMouseMove}
        onMouseLeave={handlers.onMouseLeave}
        {...props}
      >
        <AnimatePresence>
          {activeRect && (
            <motion.div
              key={sessionRef.current}
              className="pointer-events-none absolute -z-1 rounded-lg bg-accent/50"
              initial={{
                opacity: 0,
                top: activeRect.top,
                left: activeRect.left,
                width: activeRect.width,
                height: activeRect.height,
              }}
              animate={{
                opacity: 1,
                top: activeRect.top,
                left: activeRect.left,
                width: activeRect.width,
                height: activeRect.height,
              }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{
                ...spring.fast,
                opacity: { duration: 0.08 },
              }}
            />
          )}
        </AnimatePresence>
        {children}
      </div>
    </HeaderButtonGroupContext.Provider>
  );
}

function HeaderButtonGroupItem({
  index,
  children,
  className,
  ...props
}: { index: number } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const ctx = useContext(HeaderButtonGroupContext);

  useRegisterProximityItem(ctx?.registerItem, index, ref);

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

export { HeaderButtonGroup, HeaderButtonGroupItem };
