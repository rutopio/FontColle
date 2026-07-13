import { motion } from "motion/react";
import type { ReactNode } from "react";

// Fades one route-specific content block IN when the route changes, leaving the
// surrounding frame untouched. Used three times inside FilterLayout — around the
// rail buttons, the sidebar panel, and the main area.
//
// FilterLayout re-mounts on a real route change (list <-> detail), so this
// motion element mounts fresh and plays initial -> animate ONCE. Crucially it is
// NOT keyed on anything that changes within a page: both pages re-render many
// times while loading (deferred filter, glyph coverage, effects), and a keyed
// element would re-mount and replay the fade on every one of those, reading as
// repeated flashes. Un-keyed, those re-renders reconcile the same element and
// never re-trigger the entry — only the route change (which re-mounts the whole
// layout) does. `initial` opacity 0 means the new content never shows for a
// frame before fading, so there's no blink. The one-time fade on first load /
// hydration reads as a normal entrance.
export function RouteFade({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  // The entry animation is disabled under prefers-reduced-motion via the
  // MotionConfig reducedMotion="user" wrapper in __root (it zeroes transform/
  // opacity transitions app-wide), so no per-component guard is needed here.
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
