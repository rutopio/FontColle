import { useCallback, useSyncExternalStore } from "react";

// For preferences that survive reloads but must never leak into a shared URL.
// The server and hydration render `initial`; the first client pass reads the
// stored value.
//
// Writes are best-effort: quota and private-mode errors fall back to the
// in-memory overlay, so the value still updates for this session.

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

// Mirrors localStorage where it works; reads prefer the real stored value.
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
