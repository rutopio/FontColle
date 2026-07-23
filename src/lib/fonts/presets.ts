import { useCallback, useSyncExternalStore } from "react";
import { type FilterSearch, parseFilterSearch } from "./filter";

// v1 presets live in localStorage, shaped for a possible one-time upload+merge
// in a future account-synced v2 (same reasoning as favorites). A preset stores
// the FilterSearch OBJECT, not a serialized query string: decoding then stays
// parseFilterSearch's job, so a stored preset written before a param existed
// (or after one was retired) degrades the same way a shared URL does — unknown
// keys drop, missing keys read as absent — with no separate migration path.
const KEY = "font-colle.presets.v1";

export interface FilterPreset {
  id: string;
  name: string;
  // The filter half of the URL search only. `sort` and `fav` are deliberately
  // excluded: a preset is a set of conditions, not a view, so applying one
  // leaves the reader's own sort order and favorites view alone.
  search: FilterSearch;
}

// A preset per distinct combination a person actually browses with; past this
// the panel is a scroll of near-duplicates and localStorage quota starts to
// matter. save() refuses rather than silently evicting, so nothing is lost
// without the user seeing why.
export const MAX_PRESETS = 20;

interface PresetStore {
  presets: FilterPreset[];
}

// Module-level store read through useSyncExternalStore, so the sidebar panel
// and any future entry point share one array and a save anywhere updates them
// all. The server (and hydration) renders the empty list; the first client pass
// after hydration reads the stored one. Mirrors ./favorites.
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

/** Coerce one stored entry into a FilterPreset, or null if it isn't one. Runs
 *  the search half through parseFilterSearch so a hand-edited or stale entry
 *  can only ever yield known keys with string values. */
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

// Ids only have to be unique within one device's list, and presets are created
// by hand one at a time, so the clock plus a random tail is plenty — no need to
// pull in crypto.randomUUID (absent on some older mobile browsers over http).
const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** True when two searches hold the same filter conditions. Both sides come from
 *  filterToSearch / parseFilterSearch, which omit empty keys entirely, so a
 *  key-by-key compare over the union is exact. */
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

  // Returns false when the list is full, so the caller can say so instead of a
  // click appearing to do nothing.
  const save = useCallback((name: string, search: FilterSearch) => {
    const prev = getSnapshot();
    if (prev.length >= MAX_PRESETS) return false;
    write([...prev, { id: newId(), name, search }]);
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    write(getSnapshot().filter((p) => p.id !== id));
  }, []);

  // Put a removed preset back where it was, for the undo on the delete toast.
  // Presets live only in this device's localStorage, so a mis-click is
  // otherwise unrecoverable — the user would have to rebuild the filter from
  // memory and re-save it.
  //
  // Re-inserts by index and keeps the original id, rather than going through
  // save(): save() appends and mints a new id, which would move the row and
  // break the identity the active-preset comparison relies on. No MAX_PRESETS
  // guard needed — this only ever restores a slot the same list just freed.
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
