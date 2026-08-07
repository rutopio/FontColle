import { type EffectCallback, useEffect } from "react";

export function useMountEffect(effect: EffectCallback) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only
  useEffect(effect, []);
}
