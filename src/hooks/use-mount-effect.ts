import { type EffectCallback, useEffect } from "react";

/**
 * Runs an effect exactly once after mount, with optional cleanup on unmount.
 * This is the only sanctioned way to call useEffect in this codebase —
 * for one-time external system synchronisation (DOM reads, subscriptions, etc.).
 */
export function useMountEffect(effect: EffectCallback) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only
  useEffect(effect, []);
}
