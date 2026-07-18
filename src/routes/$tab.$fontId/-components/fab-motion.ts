// Enter/exit motion shared by the detail page's floating action buttons, so a
// FAB that appears or disappears on a tab change scales from its own centre
// instead of popping. Scale + opacity only (both compositor properties), and
// `active:scale-95` is dropped from those buttons since motion owns transform,
// the press feedback rides on whileTap instead.
//
// MotionConfig reducedMotion="user" (see __root) already neutralises the
// transform for users who ask for less motion; the fade still runs.
import { MOTION_S } from "@/lib/motion";

export const FAB_MOTION = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
  whileTap: { scale: 0.95 },
  transition: { duration: MOTION_S.base, ease: "easeOut" },
} as const;

// Resting bottom offset for a FAB in its stack slot (0 = lowest), measured with
// the preview dock down. Static: `bottom` is a layout property and the value
// carries an env() the browser won't interpolate, so the dock-follow below
// animates transform instead.
const BASE_INSET = 1; // rem, gap from the viewport edge
const SLOT = 3.5; // rem, one FAB height (size-14)
const GAP = 1; // rem, between stacked FABs
const DOCK = 4; // rem, filter-layout's footer height

export function fabBottom(slot: number): string {
  const rem = BASE_INSET + slot * (SLOT + GAP);
  return `calc(${rem}rem + env(safe-area-inset-bottom))`;
}

// Lifts the stack by the dock's height while it's up. A transform (compositor)
// rather than a bottom change, and the 0.2s easeOut matches filter-layout's own
// footer collapse, so the buttons travel with the dock instead of after it.
export function fabLift(dockVisible: boolean) {
  return { y: dockVisible ? `-${DOCK}rem` : "0rem" };
}

export const FAB_SHIFT = { duration: MOTION_S.base, ease: "easeOut" } as const;
