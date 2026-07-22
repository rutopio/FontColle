// The app's motion scale. Three steps, picked by how much travel the element
// does and how often it is seen, not by taste:
//
//   fast  — tooltips, chips, button feedback. Small travel, seen constantly.
//   base  — popovers, selects, dropdowns. Anchored to a trigger.
//   slow  — sheets, dialogs, route changes. Full-viewport travel.
//
// These were briefly collapsed to a single 60ms value. 60ms is below the
// threshold where motion reads as movement at all — every animation became a
// flicker, and a sheet sliding in from the edge lost its direction. The steps
// are back because a tooltip and a drawer genuinely need different budgets.
//
// Dual-sourced with src/styles.css, whose `--motion-*` custom properties must
// carry these same numbers. Keep the two in sync.
export const MOTION = {
  fast: 120,
  base: 180,
  slow: 240,
} as const;

// Seconds form for motion/react `transition.duration`.
export const MOTION_S = {
  fast: MOTION.fast / 1000,
  base: MOTION.base / 1000,
  slow: MOTION.slow / 1000,
} as const;

// The app's ease-out, as motion/react's cubic-bezier tuple. Mirrors --ease-out
// in src/styles.css — keep the four numbers identical, or a JS-driven element
// and its CSS-driven neighbour will drift apart mid-travel.
//
// This replaces `ease: "easeOut"` at every call site. The built-in keyword is
// too gentle to read as intentional; this curve front-loads the movement, which
// is where the eye is during an entrance.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
