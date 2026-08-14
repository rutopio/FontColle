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

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const spring = {
  fast: {
    type: "spring" as const,
    duration: 0.08,
    bounce: 0,
    exit: { duration: 0.06 },
  },
  moderate: {
    type: "spring" as const,
    duration: 0.16,
    bounce: 0,
    exit: { duration: 0.12 },
  },
} as const;

/** Force-unmount delay when exit animation stalls (e.g. background tab). */
export const exitFallbackMs = (tier: { exit: { duration: number } }) =>
  Math.round(tier.exit.duration * 1000) + 100;
