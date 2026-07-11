import { useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

// Cross-route enter/exit for list <-> detail. The new page fades in and rises a
// few px; the old one fades out first (mode="wait"). initial={false} skips the
// animation on first paint/SSR, so a hard load or hydration doesn't flash.
//
// The div is a plain full-width wrapper — the page inside (SidebarProvider)
// still owns its own min-h-svh height, so opacity/transform have a real box to
// act on without changing the layout the Column's absolute-fill depends on.
const PAGE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
} as const;

export function RouteTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Key on the route id, not the full pathname: every /$fontId shares one id, so
  // navigating between two detail pages animates once (as a page change) rather
  // than re-keying on each fontId. List (/) and detail (/$fontId) still differ.
  const key = router.state.location.pathname === "/" ? "/" : "/$fontId";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        {...PAGE}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
