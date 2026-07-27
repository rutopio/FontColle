// Enter/exit motion shared by the detail page's FABs. Scale + opacity only,
// both compositor properties. Those buttons drop `active:scale-95` since motion
// owns transform: the press feedback rides on whileTap instead.
//
// __root's MotionConfig already neutralises the transform under reduced motion.
import { EASE_OUT, MOTION_S } from "@/lib/motion";

export const FAB_MOTION = {
  // Shallow deliberately: a FAB is a solid 56px disc, so a deep scale reads as
  // popping out of nowhere rather than arriving.
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  whileTap: { scale: 0.95 },
  transition: { duration: MOTION_S.base, ease: EASE_OUT },
} as const;

// Static: `bottom` is a layout property and this carries an env() the browser
// won't interpolate, so the dock-follow below animates transform instead.
const BASE_INSET = 1; // rem, gap from the viewport edge
const SLOT = 3.5; // rem, one FAB height (size-14)
const GAP = 1; // rem, between stacked FABs
const DOCK = 4; // rem, filter-layout's footer height

export function fabBottom(slot: number): string {
  const rem = BASE_INSET + slot * (SLOT + GAP);
  return `calc(${rem}rem + env(safe-area-inset-bottom))`;
}

// Timing matches filter-layout's footer collapse, so the buttons travel with
// the dock instead of after it.
export function fabLift(dockVisible: boolean) {
  return { y: dockVisible ? `-${DOCK}rem` : "0rem" };
}

export const FAB_SHIFT = { duration: MOTION_S.base, ease: EASE_OUT } as const;
