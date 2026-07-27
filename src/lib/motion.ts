// The app's motion scale, stepped by how much travel the element does:
//
//   fast  — tooltips, chips, button feedback. Small travel, seen constantly.
//   base  — popovers, selects, dropdowns. Anchored to a trigger.
//   slow  — sheets, dialogs, route changes. Full-viewport travel.
//
// Dual-sourced with src/styles.css, whose `--motion-*` custom properties must
// carry these same numbers. Keep the two in sync.
export const MOTION = {
  fast: 120,
  base: 180,
  slow: 240,
} as const;

export const MOTION_S = {
  fast: MOTION.fast / 1000,
  base: MOTION.base / 1000,
  slow: MOTION.slow / 1000,
} as const;

// The app's ease-out, as motion/react's cubic-bezier tuple. Use in place of
// `ease: "easeOut"`. Mirrors --ease-out in src/styles.css — keep the four
// numbers identical, or a JS-driven element and its CSS-driven neighbour will
// drift apart mid-travel.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
