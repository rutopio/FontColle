import { useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import { EASE_OUT, MOTION_S } from "@/lib/motion";

/**
 * Returns true on the first render after a route change, false otherwise.
 * Must update AFTER commit so that concurrent renders all read the pre-navigation
 * value — this is the one case where a post-commit write (effect) is essential.
 */
function useRouteChanged(pathname: string): boolean {
  const committed = useRef<string | undefined>(undefined);
  const changed =
    committed.current !== undefined && committed.current !== pathname;
  useEffect(() => {
    committed.current = pathname;
  }, [pathname]);
  return changed;
}

export function RouteFade({
  className,
  children,
  distance = 6,
}: {
  className?: string;
  children: ReactNode;
  distance?: number;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const changed = useRouteChanged(pathname);

  return (
    <motion.div
      initial={changed ? { opacity: 0, y: distance } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_S.slow, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
