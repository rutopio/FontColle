import { useCallback, useSyncExternalStore } from "react";

// Shaped for a possible one-time upload+merge into an account-synced v2, so
// keep it a flat, stable array of family ids.
const KEY = "font-colle.favorites.v1";

interface FavStore {
  favorites: string[];
}

// The server and hydration render the empty list; the first client pass after
// hydration reads the stored one.

const EMPTY: string[] = [];
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

function read(): string[] {
  if (typeof localStorage === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as FavStore;
    return Array.isArray(parsed.favorites) ? parsed.favorites : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Snapshot cache: useSyncExternalStore compares snapshots with Object.is, so
// reads must keep returning the same array until a write replaces it.
let cache: string[] | null = null;
const getSnapshot = () => {
  if (cache === null) cache = read();
  return cache;
};
const getServerSnapshot = () => EMPTY;

export function useFavorites() {
  const favorites = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggle = useCallback((id: string) => {
    const prev = getSnapshot();
    const next = prev.includes(id)
      ? prev.filter((x) => x !== id)
      : [...prev, id];
    cache = next;
    try {
      localStorage.setItem(KEY, JSON.stringify({ favorites: next }));
    } catch {
      // ignore quota / private mode errors
    }
    emit();
  }, []);

  return { favorites, toggle };
}
