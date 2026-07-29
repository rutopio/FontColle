import { useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { EASE_OUT, MOTION_S } from "@/lib/motion";

// Module-level so remounts at the same URL skip the fade; undefined on first
// render so SSR doesn't ship opacity:0.
let lastPath: string | undefined;

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
  // Committed in effect so all RouteFades see the same previous path.
  const changed = lastPath !== undefined && lastPath !== pathname;
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);

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
