import { EASE_OUT, MOTION_S } from "@/lib/motion";

export const FAB_MOTION = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  whileTap: { scale: 0.95 },
  transition: { duration: MOTION_S.base, ease: EASE_OUT },
} as const;

const BASE_INSET = 1;
const SLOT = 3.5;
const GAP = 1;
const DOCK = 4;

export function fabBottom(slot: number): string {
  const rem = BASE_INSET + slot * (SLOT + GAP);
  return `calc(${rem}rem + env(safe-area-inset-bottom))`;
}

export function fabLift(dockVisible: boolean) {
  return { y: dockVisible ? `-${DOCK}rem` : "0rem" };
}

export const FAB_SHIFT = { duration: MOTION_S.base, ease: EASE_OUT } as const;
