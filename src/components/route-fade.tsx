import { useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { EASE_OUT, MOTION_S } from "@/lib/motion";

// Fades one route-specific content block IN when the route changes, leaving the
// surrounding frame untouched. Used three times inside FilterLayout, around the
// rail buttons, the sidebar panel, and the main area.
//
// Keyed on the PATHNAME, never on mounting, which is not a reliable signal for
// "the route changed" and fires in two harmful cases:
//
//   * Mid-load, when the list swaps FirstPagePending -> Catalog. Those are
//     different component types, so React remounts FilterLayout and every
//     RouteFade in it, blinking the whole page on top of the content swap.
//   * On first paint, where Motion writes `initial` into the rendered markup,
//     shipping SSR HTML at `opacity:0` that stays blank until JS hydrates.
//
// The module-level `lastPath` survives that remount, so a remount at the same
// URL renders already visible. It starts undefined, so the session's first
// render also skips the animation and paints immediately.
let lastPath: string | undefined;

export function RouteFade({
  className,
  children,
  // Entry travel in px. The rail and sidebar barely change between routes, so
  // they take the small default; the main area needs more to read as motion.
  distance = 6,
}: {
  className?: string;
  children: ReactNode;
  distance?: number;
}) {
  // reduced-motion is handled app-wide by __root's MotionConfig, so this needs
  // no guard of its own.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Compared during render but committed in an effect, so all three RouteFades
  // see the same previous path and agree on whether to fade. Committing during
  // render would let the first one flip the flag and leave the others static.
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
