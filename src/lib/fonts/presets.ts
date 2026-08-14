import { useCallback, useSyncExternalStore } from "react";
import { type FilterSearch, parseFilterSearch } from "./filter";

const KEY = "font-fridge.presets.v1";

export interface FilterPreset {
  id: string;
  name: string;
  search: FilterSearch;
}

export const MAX_PRESETS = 20;

interface PresetStore {
  presets: FilterPreset[];
}

const EMPTY: FilterPreset[] = [];
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

function revivePreset(raw: unknown): FilterPreset | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { id, name, search } = raw as Record<string, unknown>;
  if (typeof id !== "string" || typeof name !== "string") return null;
  if (typeof search !== "object" || search === null) return null;
  return {
    id,
    name,
    search: parseFilterSearch(search as Record<string, unknown>),
  };
}

function read(): FilterPreset[] {
  if (typeof localStorage === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as PresetStore;
    if (!Array.isArray(parsed.presets)) return EMPTY;
    const revived = parsed.presets
      .map(revivePreset)
      .filter((p): p is FilterPreset => p !== null);
    return revived.length > 0 ? revived : EMPTY;
  } catch {
    return EMPTY;
  }
}

let cache: FilterPreset[] | null = null;
const getSnapshot = () => {
  if (cache === null) cache = read();
  return cache;
};
const getServerSnapshot = () => EMPTY;

function write(next: FilterPreset[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ presets: next }));
  } catch {
    // ignore quota / private mode errors
  }
  emit();
}

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function sameSearch(a: FilterSearch, b: FilterSearch): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const ka = k as keyof FilterSearch;
    if ((a[ka] ?? undefined) !== (b[ka] ?? undefined)) return false;
  }
  return true;
}

export function usePresets() {
  const presets = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const save = useCallback((name: string, search: FilterSearch) => {
    const prev = getSnapshot();
    if (prev.length >= MAX_PRESETS) return false;
    write([...prev, { id: newId(), name, search }]);
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((p) => p.id !== id));
  }, []);

  const restore = useCallback((preset: FilterPreset, index: number) => {
    const next = getSnapshot().slice();
    if (next.some((p) => p.id === preset.id)) return;
    next.splice(Math.min(index, next.length), 0, preset);
    write(next);
  }, []);

  const rename = useCallback((id: string, name: string) => {
    write(getSnapshot().map((p) => (p.id === id ? { ...p, name } : p)));
  }, []);

  return { presets, save, remove, restore, rename };
}
