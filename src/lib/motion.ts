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
