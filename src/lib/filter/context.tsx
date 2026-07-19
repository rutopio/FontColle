import { createContext, type ReactNode, useContext, useRef } from "react";
import type { FilterGroupId } from "@/components/filter/groups";

interface FilterContextValue {
  // Last known list scroll position. A ref (not state) because it's read/written
  // imperatively around navigation and must never trigger a re-render. Restoring
  // it manually is more reliable than router scrollRestoration for the window
  // virtualizer, whose total height isn't final on the first frame back.
  listScrollY: React.RefObject<number>;
  // Which sidebar panel (Style, Designer, Metric…) was last open. Also a ref:
  // the list seeds its own useState from it on mount and writes back on change,
  // so the panel survives a trip to a font's detail page. Unlike the filter
  // itself it stays out of the URL — it's a view preference, not a result-set
  // condition, and a shared link shouldn't force the recipient into your panel.
  lastGroup: React.RefObject<FilterGroupId | null>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// Carries the list's scroll position across list <-> detail navigation (the
// detail URL has no filter params, so the list restores its own state on
// return). The ref-in-context never changes identity, so the provider never
// re-renders consumers.
export function FilterProvider({ children }: { children: ReactNode }) {
  const listScrollY = useRef(0);
  // null until the list first commits a panel, so the list can tell "never
  // visited" (use the default) from a real earlier choice.
  const lastGroup = useRef<FilterGroupId | null>(null);
  const value = useRef<FilterContextValue>({ listScrollY, lastGroup });
  return (
    <FilterContext.Provider value={value.current}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return ctx;
}
