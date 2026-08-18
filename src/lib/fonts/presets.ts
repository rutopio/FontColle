import { useCallback, useSyncExternalStore } from "react";
import { writeStorage } from "@/lib/storage-warning";
import { type FilterSearch, parseFilterSearch } from "./filter";

const KEY = "font-fridge.presets.v1";

const FILE_TYPE = "font-fridge.presets";
const FILE_VERSION = 1;

export interface FilterPreset {
  id: string;
  name: string;
  search: FilterSearch;
}

export const MAX_PRESETS = 20;

interface PresetStore {
  presets: FilterPreset[];
}

export interface PresetsFile {
  type: typeof FILE_TYPE;
  version: number;
  exportedAt: string;
  presets: FilterPreset[];
}

export type ImportMode = "merge" | "replace";

export interface ImportResult {
  added: number;
  removed: number;
  duplicate: number;
  dropped: number;
  total: number;
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
  writeStorage(KEY, JSON.stringify({ presets: next }));
  emit();
}

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function buildPresetsFile(presets: FilterPreset[]): PresetsFile {
  return {
    type: FILE_TYPE,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    presets,
  };
}

/** Pulls the preset list out of an exported file, or null if it isn't one. */
export function parsePresetsFile(raw: unknown): FilterPreset[] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { type, presets } = raw as Record<string, unknown>;
  if (type !== FILE_TYPE) return null;
  if (!Array.isArray(presets)) return null;
  return presets.map(revivePreset).filter((p): p is FilterPreset => p !== null);
}

/** Incoming ids are reissued; duplicates skipped; excess past MAX_PRESETS dropped. */
export function applyImport(
  current: FilterPreset[],
  incoming: FilterPreset[],
  mode: ImportMode
): { next: FilterPreset[]; result: ImportResult } {
  const base = mode === "replace" ? [] : current;
  const next = [...base];
  let duplicate = 0;
  let dropped = 0;
  for (const preset of incoming) {
    if (
      next.some(
        (p) => p.name === preset.name && sameSearch(p.search, preset.search)
      )
    ) {
      duplicate++;
      continue;
    }
    if (next.length >= MAX_PRESETS) {
      dropped++;
      continue;
    }
    next.push({ ...preset, id: newId() });
  }
  const kept = new Set(next.map((p) => p.id));
  return {
    next,
    result: {
      added: next.length - base.length,
      removed: current.filter((p) => !kept.has(p.id)).length,
      duplicate,
      dropped,
      total: next.length,
    },
  };
}

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

  const importPresets = useCallback(
    (incoming: FilterPreset[], mode: ImportMode) => {
      const { next, result } = applyImport(getSnapshot(), incoming, mode);
      write(next);
      return result;
    },
    []
  );

  const restoreAll = useCallback((prev: FilterPreset[]) => write(prev), []);

  return {
    presets,
    save,
    remove,
    restore,
    rename,
    importPresets,
    restoreAll,
  };
}
