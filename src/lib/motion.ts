// The app's motion duration scale: three steps, one system. Every animation
// snaps to one of these, fast for confirmations/hover, base for entrances and
// most transitions, slow for the larger, more expressive beats (route change,
// celebratory pop).
//
// Dual-sourced: these numbers are mirrored as CSS custom properties in
// src/styles.css (--motion-fast / --motion-base / --motion-slow). CSS
// animations reference the var(); motion/react configs and other JS import
// these constants. Keep the two locations in sync, if you change a value
// here, change it there too.
//
// Values are milliseconds. motion/react wants seconds, so use the *_S helpers.
export const MOTION = {
  fast: 120,
  base: 160,
  slow: 220,
} as const;

// Seconds form for motion/react `transition.duration`.
export const MOTION_S = {
  fast: MOTION.fast / 1000, // 0.12
  base: MOTION.base / 1000, // 0.16
  slow: MOTION.slow / 1000, // 0.22
} as const;
