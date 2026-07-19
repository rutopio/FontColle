import { useCallback, useSyncExternalStore } from "react";

// A useState-shaped hook backed by localStorage, for personal-device
// preferences that should survive reloads but must never leak into a shared
// URL (view mode, preview text, …). Reads go through useSyncExternalStore:
// the server (and hydration) renders `initial`, the first client pass after
// hydration reads the stored value — no sync effect, no flash-of-initial
// beyond hydration. All hook instances share one listener set, so a write
// from any of them updates the rest in the same tab.
//
// Writes are best-effort: quota / private-mode errors fall back to the
// in-memory overlay so the value still updates for this session, matching
// the theme toggle's behavior.

const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

// Session fallback for environments where localStorage throws. When storage
// works this mirrors it, and reads prefer the real stored value.
const memory = new Map<string, string>();

export function useLocalStorageState(
  key: string,
  initial: string
): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = localStorage.getItem(key);
        if (raw != null) return raw;
      } catch {
        // ignore private-mode read errors
      }
      return memory.get(key) ?? initial;
    },
    () => initial
  );

  const set = useCallback(
    (v: string) => {
      memory.set(key, v);
      try {
        localStorage.setItem(key, v);
      } catch {
        // ignore quota / private-mode errors
      }
      emit();
    },
    [key]
  );

  return [value, set];
}
