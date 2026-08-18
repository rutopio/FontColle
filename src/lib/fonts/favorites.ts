import { useCallback, useSyncExternalStore } from "react";
import { writeStorage } from "@/lib/storage-warning";

const KEY = "font-fridge.favorites.v1";

const FILE_TYPE = "font-fridge.favorites";
const FILE_VERSION = 1;

interface FavStore {
  favorites: string[];
}

export interface FavoritesFile {
  type: typeof FILE_TYPE;
  version: number;
  exportedAt: string;
  favorites: string[];
}

export type ImportMode = "merge" | "replace";

export interface ImportResult {
  added: number;
  removed: number;
  skipped: number;
  total: number;
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

// Bumped on add only; separate from the list so list subscribers don't re-render.
let addTick = 0;
const tickListeners = new Set<() => void>();
const subscribeAdd = (cb: () => void) => {
  tickListeners.add(cb);
  return () => {
    tickListeners.delete(cb);
  };
};
const getAddTick = () => addTick;
const getServerAddTick = () => 0;
const pingAdd = () => {
  addTick++;
  for (const l of tickListeners) l();
};

/** Ticks up each time a font is added to favorites; 0 on the server. */
export function useFavoriteAdded(): number {
  return useSyncExternalStore(subscribeAdd, getAddTick, getServerAddTick);
}

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

function write(next: string[]) {
  cache = next;
  writeStorage(KEY, JSON.stringify({ favorites: next }));
  emit();
}

export function buildFavoritesFile(favorites: string[]): FavoritesFile {
  return {
    type: FILE_TYPE,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    favorites,
  };
}

/** Pulls the id list out of an exported file, or null if it isn't one. */
export function parseFavoritesFile(raw: unknown): string[] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { type, favorites } = raw as Record<string, unknown>;
  if (type !== FILE_TYPE) return null;
  if (!Array.isArray(favorites)) return null;
  const ids = favorites.filter((id): id is string => typeof id === "string");
  return [...new Set(ids)];
}

/** Ids missing from `known` are dropped (catalog changes over time). */
export function applyImport(
  current: string[],
  incoming: string[],
  mode: ImportMode,
  known: ReadonlySet<string>
): { next: string[]; result: ImportResult } {
  const valid = incoming.filter((id) => known.has(id));
  const skipped = incoming.length - valid.length;
  const base = mode === "replace" ? [] : current;
  const seen = new Set(base);
  const next = [...base];
  for (const id of valid) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  const kept = new Set(next);
  return {
    next,
    result: {
      added: next.length - base.length,
      removed: current.filter((id) => !kept.has(id)).length,
      skipped,
      total: next.length,
    },
  };
}

export function useFavorites() {
  const favorites = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggle = useCallback((id: string) => {
    const prev = getSnapshot();
    const adding = !prev.includes(id);
    write(adding ? [...prev, id] : prev.filter((x) => x !== id));
    if (adding) pingAdd();
  }, []);

  const importFavorites = useCallback(
    (incoming: string[], mode: ImportMode, known: ReadonlySet<string>) => {
      const { next, result } = applyImport(
        getSnapshot(),
        incoming,
        mode,
        known
      );
      write(next);
      return result;
    },
    []
  );

  const restore = useCallback((prev: string[]) => write(prev), []);

  return { favorites, toggle, importFavorites, restore };
}
