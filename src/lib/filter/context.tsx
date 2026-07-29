import { createContext, type ReactNode, useContext, useRef } from "react";
import type { FilterGroupId } from "@/components/filter/groups";

interface FilterContextValue {
  listScrollY: React.RefObject<number>;
  lastGroup: React.RefObject<FilterGroupId | null>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const listScrollY = useRef(0);
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
