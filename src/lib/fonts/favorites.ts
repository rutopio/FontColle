import { useCallback, useEffect, useState } from "react";

// v1 favorites live in localStorage, shaped for a possible one-time upload+merge
// in a future account-synced v2. Keep the shape flat and stable: an array of
// family ids.
const KEY = "font-colle.favorites.v1";

interface FavStore {
  favorites: string[];
}

function read(): FavStore {
  if (typeof localStorage === "undefined") return { favorites: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { favorites: [] };
    const parsed = JSON.parse(raw) as FavStore;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
    };
  } catch {
    return { favorites: [] };
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(read().favorites);
  }, []);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify({ favorites: next }));
      } catch {
        // ignore quota / private mode errors
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}
