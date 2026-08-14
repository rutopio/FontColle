import { useCallback, useSyncExternalStore } from "react";

const KEY = "font-fridge.favorites.v1";

interface FavStore {
  favorites: string[];
}

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
