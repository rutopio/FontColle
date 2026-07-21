import { useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { MOTION_S } from "@/lib/motion";

// Fades one route-specific content block IN when the route changes, leaving the
// surrounding frame untouched. Used three times inside FilterLayout, around the
// rail buttons, the sidebar panel, and the main area.
//
// The entry is driven by the PATHNAME, not by mounting, because mounting is not
// a reliable signal for "the route changed":
//
//   * Mounting fires too often. The list swaps FirstPagePending -> Catalog when
//     the client-side catalog resolves, and those are different component types,
//     so React unmounts one subtree and mounts the other — FilterLayout and
//     every RouteFade inside it included. Keyed on mount, the whole page faded
//     out and back in mid-load, on top of the content swap. That double blink
//     was the bug this keying fixes.
//   * Mounting also fires on the very first paint, where an entry animation is
//     actively harmful: Motion writes `initial` into the markup it renders, so
//     the SSR HTML shipped with `opacity:0` on all three blocks and the page
//     stayed blank until the JS bundle downloaded, hydrated and ran the fade.
//
// Keying on the pathname handles both. The module-level `lastPath` survives the
// unmount/remount above, so a remount at the same URL renders with the content
// already visible (`initial={false}`), while a genuine navigation sees a new
// pathname and plays the fade once. It starts undefined, so the first render of
// the session — server or client — also skips the animation and paints
// immediately.
let lastPath: string | undefined;

export function RouteFade({
  className,
  children,
  // Entry travel in px. The rail and sidebar barely change between the list and
  // detail routes, so they use the small default; the main area gets a larger
  // value so the page-to-page transition actually reads as motion.
  distance = 6,
}: {
  className?: string;
  children: ReactNode;
  distance?: number;
}) {
  // The entry animation is disabled under prefers-reduced-motion via the
  // MotionConfig reducedMotion="user" wrapper in __root (it zeroes transform/
  // opacity transitions app-wide), so no per-component guard is needed here.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Compared during render but committed in an effect: all three RouteFades in
  // a layout render before any effect runs, so each one sees the same previous
  // path and they agree on whether to fade. Committing during render would let
  // whichever rendered first flip the flag and leave the other two static.
  const changed = lastPath !== undefined && lastPath !== pathname;
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);

  return (
    <motion.div
      initial={changed ? { opacity: 0, y: distance } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_S.slow, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
