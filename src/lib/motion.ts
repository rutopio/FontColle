// The app's motion duration, one number for the whole system. Every animation
// snaps to it. There used to be a fast/base/slow scale, but the three steps
// were tuned to the same value, so this collapses them to a single source:
// change MOTION_MS and every animation (JS + CSS) follows.
//
// Dual-sourced with src/styles.css: the CSS `--motion-*` custom properties all
// resolve to `--motion` there, which must carry this same number. Keep the two
// in sync — if you change MOTION_MS here, change --motion there too.
export const MOTION_MS = 60;

// Milliseconds form. The fast/base/slow keys are kept as aliases of the single
// duration so existing callers (MOTION.base, MOTION_S.slow, …) keep working
// without a sweep; they all resolve to the same value now.
export const MOTION = {
  fast: MOTION_MS,
  base: MOTION_MS,
  slow: MOTION_MS,
} as const;

// Seconds form for motion/react `transition.duration`.
export const MOTION_S = {
  fast: MOTION_MS / 1000,
  base: MOTION_MS / 1000,
  slow: MOTION_MS / 1000,
} as const;
