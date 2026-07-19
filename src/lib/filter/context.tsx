import { createContext, type ReactNode, useContext, useRef } from "react";

interface FilterContextValue {
  // Last known list scroll position. A ref (not state) because it's read/written
  // imperatively around navigation and must never trigger a re-render. Restoring
  // it manually is more reliable than router scrollRestoration for the window
  // virtualizer, whose total height isn't final on the first frame back.
  listScrollY: React.RefObject<number>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// Carries the list's scroll position across list <-> detail navigation (the
// detail URL has no filter params, so the list restores its own state on
// return). The ref-in-context never changes identity, so the provider never
// re-renders consumers.
export function FilterProvider({ children }: { children: ReactNode }) {
  const listScrollY = useRef(0);
  const value = useRef<FilterContextValue>({ listScrollY });
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
