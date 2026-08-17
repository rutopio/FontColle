import { useCallback, useSyncExternalStore } from "react";
import { writeStorage } from "@/lib/storage-warning";

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
      writeStorage(key, v);
      emit();
    },
    [key]
  );

  return [value, set];
}
