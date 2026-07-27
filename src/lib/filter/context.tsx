import { createContext, type ReactNode, useContext, useRef } from "react";
import type { FilterGroupId } from "@/components/filter/groups";

interface FilterContextValue {
  // A ref, not state: read/written imperatively around navigation, and must
  // never trigger a re-render. Restoring manually beats router
  // scrollRestoration here, since the virtualizer's total height isn't final
  // on the first frame back.
  listScrollY: React.RefObject<number>;
  // The last open sidebar panel, so it survives a trip to a detail page. Stays
  // out of the URL: a view preference, not a result-set condition, and a shared
  // link shouldn't force the recipient into your panel.
  lastGroup: React.RefObject<FilterGroupId | null>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// The detail URL has no filter params, so the list restores its own state on
// return. These refs never change identity, so consumers never re-render.
export function FilterProvider({ children }: { children: ReactNode }) {
  const listScrollY = useRef(0);
  // null until the list first commits one, distinguishing "never visited" from
  // a real earlier choice.
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
