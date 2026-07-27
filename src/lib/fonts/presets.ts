import { useCallback, useSyncExternalStore } from "react";
import { type FilterSearch, parseFilterSearch } from "./filter";

// A preset stores the FilterSearch OBJECT, not a query string, so decoding
// stays parseFilterSearch's job: a preset written before a param existed (or
// after one was retired) degrades exactly like a shared URL, no migration path.
const KEY = "font-colle.presets.v1";

export interface FilterPreset {
  id: string;
  name: string;
  // The filter half only: a preset is a set of conditions, not a view, so
  // applying one leaves the reader's own sort and favorites alone.
  search: FilterSearch;
}

// save() refuses past this rather than silently evicting.
export const MAX_PRESETS = 20;

interface PresetStore {
  presets: FilterPreset[];
}

// The server and hydration render the empty list; the first client pass after
// hydration reads the stored one. Mirrors ./favorites.
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

/** Runs the search half through parseFilterSearch, so a hand-edited or stale
 *  entry can only ever yield known keys with string values. */
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

// Snapshot cache: useSyncExternalStore compares snapshots with Object.is, so
// reads must keep returning the same array until a write replaces it.
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

// Unique within one device's hand-made list is enough, so no need for
// crypto.randomUUID (absent on some older mobile browsers over http).
const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Both sides come from filterToSearch / parseFilterSearch, which omit empty
 *  keys, so a key-by-key compare over the union is exact. */
export function sameSearch(a: FilterSearch, b: FilterSearch): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const ka = k as keyof FilterSearch;
    // parseFilterSearch writes `undefined` for absent keys rather than omitting
    // them, so the union can contain keys neither side really has.
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

  // Returns false when full, so the caller can say so.
  const save = useCallback((name: string, search: FilterSearch) => {
    const prev = getSnapshot();
    if (prev.length >= MAX_PRESETS) return false;
    write([...prev, { id: newId(), name, search }]);
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((p) => p.id !== id));
  }, []);

  // Undo for the delete toast. Re-inserts by index keeping the original id,
  // rather than going through save(), which appends and mints a new id: that
  // would move the row and break the identity the active-preset check uses.
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
